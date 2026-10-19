from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

_TORCH_AVAILABLE = False
_TRANSFORMERS_AVAILABLE = False
_PEFT_AVAILABLE = False
_BNB_AVAILABLE = False

try:
    import torch

    _TORCH_AVAILABLE = True
except ImportError:
    pass

try:
    import transformers  # noqa: F401

    _TRANSFORMERS_AVAILABLE = True
except ImportError:
    pass

try:
    import peft  # noqa: F401

    _PEFT_AVAILABLE = True
except ImportError:
    pass

try:
    import bitsandbytes  # noqa: F401

    _BNB_AVAILABLE = True
except ImportError:
    pass


def finetuning_deps_available() -> bool:
    return _TORCH_AVAILABLE and _TRANSFORMERS_AVAILABLE and _PEFT_AVAILABLE


@dataclass
class LoRAConfig:
    r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    target_modules: list[str] = field(
        default_factory=lambda: ["q_proj", "v_proj", "k_proj", "o_proj"]
    )
    bias: str = "none"
    task_type: str = "CAUSAL_LM"
    use_qlora: bool = False


@dataclass
class TrainingConfig:
    output_dir: str = "checkpoints/llama-finetuned"
    num_train_epochs: int = 3
    per_device_train_batch_size: int = 4
    gradient_accumulation_steps: int = 4
    learning_rate: float = 2e-4
    warmup_ratio: float = 0.1
    weight_decay: float = 0.01
    max_seq_length: int = 2048
    logging_steps: int = 10
    save_steps: int = 100
    eval_steps: int = 100
    fp16: bool = False
    bf16: bool = True
    seed: int = 42
    save_total_limit: int = 3


@dataclass
class DatasetConfig:
    train_file: str = ""
    eval_file: str = ""
    prompt_template: str = (
        "### Instruction:\n{instruction}\n\n"
        "### Input:\n{input}\n\n"
        "### Response:\n{output}"
    )
    max_samples: int = 0


class DatasetPreparer:
    REQUIRED_FIELDS = {"instruction", "output"}

    @staticmethod
    def validate_sample(sample: dict[str, Any]) -> bool:
        if not isinstance(sample, dict):
            return False
        if not all(k in sample for k in DatasetPreparer.REQUIRED_FIELDS):
            return False
        if not sample.get("instruction", "").strip():
            return False
        if not sample.get("output", "").strip():
            return False
        return True

    @staticmethod
    def load_jsonl(path: str) -> list[dict[str, Any]]:
        samples: list[dict[str, Any]] = []
        invalid_count = 0

        with open(path, encoding="utf-8") as fh:
            for line_num, line in enumerate(fh, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    sample = json.loads(line)
                except json.JSONDecodeError:
                    logger.warning("invalid_json at line %d in %s", line_num, path)
                    invalid_count += 1
                    continue

                if DatasetPreparer.validate_sample(sample):
                    samples.append(sample)
                else:
                    invalid_count += 1

        logger.info(
            "dataset_loaded",
            path=path,
            valid=len(samples),
            invalid=invalid_count,
        )
        return samples

    @staticmethod
    def format_prompt(
        sample: dict[str, Any], template: str = DatasetConfig().prompt_template
    ) -> str:
        return template.format(
            instruction=sample.get("instruction", ""),
            input=sample.get("input", ""),
            output=sample.get("output", ""),
        )

    @staticmethod
    def prepare_dataset(
        config: DatasetConfig,
    ) -> dict[str, list[dict[str, str]]]:
        result: dict[str, list[dict[str, str]]] = {"train": [], "eval": []}

        if config.train_file:
            raw = DatasetPreparer.load_jsonl(config.train_file)
            if config.max_samples > 0:
                raw = raw[: config.max_samples]
            result["train"] = [
                {"text": DatasetPreparer.format_prompt(s, config.prompt_template)}
                for s in raw
            ]

        if config.eval_file:
            raw = DatasetPreparer.load_jsonl(config.eval_file)
            result["eval"] = [
                {"text": DatasetPreparer.format_prompt(s, config.prompt_template)}
                for s in raw
            ]

        logger.info(
            "dataset_prepared",
            train_size=len(result["train"]),
            eval_size=len(result["eval"]),
        )
        return result


class LLaMAFineTuner:
    def __init__(
        self,
        model_name_or_path: str = "meta-llama/Llama-2-7b-hf",
        lora_config: LoRAConfig | None = None,
        training_config: TrainingConfig | None = None,
    ) -> None:
        self.model_name_or_path = model_name_or_path
        self.lora_config = lora_config or LoRAConfig()
        self.training_config = training_config or TrainingConfig()
        self._model: Any = None
        self._tokenizer: Any = None
        self._trainer: Any = None

    def check_environment(self) -> dict[str, Any]:
        gpu_available = _TORCH_AVAILABLE and torch.cuda.is_available()
        return {
            "torch": _TORCH_AVAILABLE,
            "transformers": _TRANSFORMERS_AVAILABLE,
            "peft": _PEFT_AVAILABLE,
            "bitsandbytes": _BNB_AVAILABLE,
            "gpu_available": gpu_available,
            "gpu_count": torch.cuda.device_count() if gpu_available else 0,
            "ready": finetuning_deps_available(),
        }

    def setup_model(self) -> dict[str, Any]:
        if not finetuning_deps_available():
            return {
                "status": "skipped",
                "reason": "Missing dependencies (torch, transformers, peft)",
                "deps": self.check_environment(),
            }

        from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

        logger.info("loading_model", model=self.model_name_or_path)

        quant_config = None
        if self.lora_config.use_qlora and _BNB_AVAILABLE:
            quant_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16,
                bnb_4bit_use_double_quant=True,
            )  # type: ignore[no-untyped-call]

        model_kwargs: dict[str, Any] = {
            "pretrained_model_name_or_path": self.model_name_or_path,
            "torch_dtype": torch.bfloat16,
            "trust_remote_code": False,
        }
        if quant_config:
            model_kwargs["quantization_config"] = quant_config

        self._model = AutoModelForCausalLM.from_pretrained(**model_kwargs)  # nosec B615
        self._tokenizer = AutoTokenizer.from_pretrained(  # nosec B615
            self.model_name_or_path, trust_remote_code=False
        )
        if self._tokenizer.pad_token is None:
            self._tokenizer.pad_token = self._tokenizer.eos_token

        if self.lora_config.use_qlora:
            self._model = prepare_model_for_kbit_training(self._model)

        peft_config = LoraConfig(
            r=self.lora_config.r,
            lora_alpha=self.lora_config.lora_alpha,
            lora_dropout=self.lora_config.lora_dropout,
            target_modules=self.lora_config.target_modules,
            bias=self.lora_config.bias,
            task_type=self.lora_config.task_type,
        )
        self._model = get_peft_model(self._model, peft_config)

        trainable, total = 0, 0
        for param in self._model.parameters():
            total += param.numel()
            if param.requires_grad:
                trainable += param.numel()

        logger.info(
            "model_ready",
            trainable_params=trainable,
            total_params=total,
            pct=f"{100 * trainable / total:.2f}%",
        )
        return {
            "status": "ready",
            "trainable_params": trainable,
            "total_params": total,
            "trainable_pct": f"{100 * trainable / total:.2f}%",
            "qlora": self.lora_config.use_qlora,
        }

    def train(self, dataset: dict[str, list[dict[str, str]]]) -> dict[str, Any]:
        if not finetuning_deps_available():
            return {"status": "skipped", "reason": "Missing dependencies"}

        if self._model is None or self._tokenizer is None:
            return {"status": "error", "reason": "Call setup_model() first"}

        from datasets import Dataset as HFDataset
        from transformers import Trainer, TrainingArguments

        train_ds = HFDataset.from_list(dataset["train"])
        eval_ds = HFDataset.from_list(dataset["eval"]) if dataset.get("eval") else None

        def tokenize(batch: dict[str, Any]) -> dict[str, Any]:
            return dict(
                self._tokenizer(
                    batch["text"],
                    truncation=True,
                    max_length=self.training_config.max_seq_length,
                    padding="max_length",
                )
            )

        train_ds = train_ds.map(tokenize, batched=True, remove_columns=["text"])
        if eval_ds:
            eval_ds = eval_ds.map(tokenize, batched=True, remove_columns=["text"])

        training_args = TrainingArguments(
            output_dir=self.training_config.output_dir,
            num_train_epochs=self.training_config.num_train_epochs,
            per_device_train_batch_size=self.training_config.per_device_train_batch_size,
            gradient_accumulation_steps=self.training_config.gradient_accumulation_steps,
            learning_rate=self.training_config.learning_rate,
            warmup_ratio=self.training_config.warmup_ratio,
            weight_decay=self.training_config.weight_decay,
            logging_steps=self.training_config.logging_steps,
            save_steps=self.training_config.save_steps,
            eval_steps=self.training_config.eval_steps if eval_ds else None,
            eval_strategy="steps" if eval_ds else "no",
            fp16=self.training_config.fp16,
            bf16=self.training_config.bf16,
            seed=self.training_config.seed,
            save_total_limit=self.training_config.save_total_limit,
            report_to="none",
        )

        self._trainer = Trainer(
            model=self._model,
            args=training_args,
            train_dataset=train_ds,
            eval_dataset=eval_ds,
        )

        logger.info("training_started", epochs=self.training_config.num_train_epochs)
        start = time.time()
        train_result = self._trainer.train()
        elapsed = time.time() - start

        metrics = {
            "status": "completed",
            "train_loss": train_result.training_loss,
            "train_runtime": elapsed,
            "train_samples_per_second": len(dataset["train"]) / elapsed
            if elapsed > 0
            else 0,
        }
        logger.info("training_completed", **metrics)
        return metrics

    def save_adapter(self, output_dir: str | None = None) -> dict[str, Any]:
        if self._model is None:
            return {"status": "error", "reason": "No model loaded"}

        out = output_dir or self.training_config.output_dir
        Path(out).mkdir(parents=True, exist_ok=True)

        if _PEFT_AVAILABLE and hasattr(self._model, "save_pretrained"):
            self._model.save_pretrained(out)
            if self._tokenizer:
                self._tokenizer.save_pretrained(out)
            logger.info("adapter_saved", path=out)
            return {"status": "saved", "path": out}

        return {"status": "skipped", "reason": "PEFT not available"}

    def generate_training_config_file(
        self, output_path: str = "training_config.json"
    ) -> str:
        config = {
            "model_name_or_path": self.model_name_or_path,
            "lora": {
                "r": self.lora_config.r,
                "lora_alpha": self.lora_config.lora_alpha,
                "lora_dropout": self.lora_config.lora_dropout,
                "target_modules": self.lora_config.target_modules,
                "bias": self.lora_config.bias,
                "task_type": self.lora_config.task_type,
                "use_qlora": self.lora_config.use_qlora,
            },
            "training": {
                "output_dir": self.training_config.output_dir,
                "num_train_epochs": self.training_config.num_train_epochs,
                "per_device_train_batch_size": self.training_config.per_device_train_batch_size,
                "gradient_accumulation_steps": self.training_config.gradient_accumulation_steps,
                "learning_rate": self.training_config.learning_rate,
                "warmup_ratio": self.training_config.warmup_ratio,
                "weight_decay": self.training_config.weight_decay,
                "max_seq_length": self.training_config.max_seq_length,
                "bf16": self.training_config.bf16,
                "seed": self.training_config.seed,
            },
            "generated_at": time.time(),
        }
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(config, fh, indent=2)
        return output_path
