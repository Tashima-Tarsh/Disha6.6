from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from .episodic import EpisodicMemory, EpisodicMemoryItem
from .semantic import SemanticMemory
from .working import WorkingMemory


class MemoryStore:
    def __init__(self, persistence_file: str | None = None) -> None:
        self.working = WorkingMemory()
        self.episodic = EpisodicMemory()
        self.semantic = SemanticMemory()
        self.persistence_file = persistence_file
        if self.persistence_file and os.path.exists(self.persistence_file):
            self.load_from_disk(self.persistence_file)

    def update_from_result(
        self, input_text: str, version: str, final_answer: str
    ) -> EpisodicMemoryItem:
        self.working.update({"last_version": version, "last_answer": final_answer})
        item = EpisodicMemoryItem(
            input_text=input_text, version=version, final_answer=final_answer
        )
        self.episodic.add(item)
        self.semantic.observe([version, *input_text.split()[:8]])
        if self.persistence_file:
            self.save_to_disk()
        return item

    def check_contradiction(self, input_text: str, candidate_answer: str) -> dict[str, Any]:
        """Check if candidate answer directly contradicts an active episodic memory."""
        relevant = self.episodic.retrieve(input_text, limit=3)
        for past in relevant:
            if past.input_text.strip().lower() == input_text.strip().lower():
                if past.final_answer.strip().lower() != candidate_answer.strip().lower():
                    return {
                        "contradiction_detected": True,
                        "conflict_with_id": past.id,
                        "conflict_answer": past.final_answer,
                        "provenance_hash": past.provenance_hash,
                    }
        return {"contradiction_detected": False}

    def retrieve(self, query: str, limit: int = 5) -> list[dict[str, Any]]:
        items = self.episodic.retrieve(query, limit=limit)
        return [
            {
                "id": item.id,
                "input_text": item.input_text,
                "version": item.version,
                "final_answer": item.final_answer,
                "timestamp": item.timestamp,
                "status": item.status,
                "confidence": item.confidence,
                "provenance_hash": item.provenance_hash,
            }
            for item in items
        ]

    def invalidate(self, item_id: str) -> bool:
        success = self.episodic.invalidate(item_id)
        if success and self.persistence_file:
            self.save_to_disk()
        return success

    def save_to_disk(self, target_path: str | None = None) -> None:
        path = target_path or self.persistence_file
        if not path:
            return
        try:
            p = Path(path)
            p.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "working": self.working.context,
                "semantic": self.semantic.entities,
                "episodic": [item.model_dump() for item in self.episodic.items],
            }
            with open(p, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass  # Resilient fallback if disk permissions not available

    def load_from_disk(self, source_path: str | None = None) -> bool:
        path = source_path or self.persistence_file
        if not path or not os.path.exists(path):
            return False
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            self.working.context = data.get("working", {})
            self.semantic.entities = data.get("semantic", {})
            self.episodic.items = [
                EpisodicMemoryItem(**item) for item in data.get("episodic", [])
            ]
            return True
        except Exception:
            return False
