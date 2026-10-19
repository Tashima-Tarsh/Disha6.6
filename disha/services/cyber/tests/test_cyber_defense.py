"""
Disha Virtual Cyber Defense System - Test Suite

Tests for the AI detection engine, response engine,
and data processing pipeline.
"""

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

# Path setup
_THIS = Path(__file__).resolve()
_REPO_ROOT = _THIS.parents[
    4
]  # disha/services/cyber/tests -> disha/services/cyber -> disha/services -> disha -> root
_CYBER = _REPO_ROOT / "disha" / "services" / "cyber"

# Add parent dirs to path for imports
for p in [str(_REPO_ROOT), str(_CYBER / "model"), str(_CYBER / "response_engine")]:
    if p not in sys.path:
        sys.path.insert(0, p)


class TestAttackClassifier(unittest.TestCase):
    """Tests for the AI attack classifier."""

    @classmethod
    def setUpClass(cls):
        try:
            import torch
        except ImportError:
            raise unittest.SkipTest("torch is not installed; skipping PyTorch attack classifier tests")

    def test_model_creation(self):
        """Test that the model can be instantiated."""
        from train import AttackClassifier

        model = AttackClassifier(input_dim=8, n_classes=5)
        self.assertIsNotNone(model)

    def test_model_forward_pass(self):
        """Test forward pass produces correct output shape."""
        import torch
        from train import AttackClassifier

        model = AttackClassifier(input_dim=8, n_classes=5)
        x = torch.randn(4, 8)
        output = model(x)
        self.assertEqual(output.shape, (4, 5))

    def test_anomaly_detector_creation(self):
        """Test anomaly detector instantiation."""
        from train import AnomalyDetector

        model = AnomalyDetector(input_dim=8, latent_dim=16)
        self.assertIsNotNone(model)

    def test_anomaly_detector_forward(self):
        """Test anomaly detector produces same-shape output."""
        import torch
        from train import AnomalyDetector

        model = AnomalyDetector(input_dim=8, latent_dim=16)
        x = torch.randn(4, 8)
        output = model(x)
        self.assertEqual(output.shape, x.shape)

    def test_dataset_featurization(self):
        """Test that log entries are featurized correctly for both formats."""
        from train import HoneypotLogDataset

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            # Cowrie-style entry
            f.write(
                json.dumps(
                    {
                        "ip": "10.0.0.1",
                        "endpoint": "/auth",
                        "method": "POST",
                        "payload": "test",
                        "user_agent": "curl/7.68",
                        "label": "brute_force",
                    }
                )
                + "\n"
            )
            # OpenCanary-style entry
            f.write(
                json.dumps(
                    {
                        "src_host": "10.0.0.2",
                        "logtype": 3000,
                        "logdata": {"PATH": "/admin", "USERAGENT": "DirBuster/1.0"},
                        "utc_time": "2026-04-11T01:27:00.000000Z",
                        "label": "scan",
                    }
                )
                + "\n"
            )
            temp_path = f.name

        try:
            dataset = HoneypotLogDataset([temp_path])
            self.assertEqual(len(dataset), 2)
            features, label = dataset[0]
            self.assertEqual(features.shape[0], HoneypotLogDataset.FEATURE_DIM)
            # Verify OpenCanary entry is also featurized correctly
            features_oc, label_oc = dataset[1]
            self.assertEqual(features_oc.shape[0], HoneypotLogDataset.FEATURE_DIM)
        finally:
            os.unlink(temp_path)

    def test_synthetic_data_generation(self):
        """Test synthetic dataset generation for bootstrapping."""
        from train import _generate_synthetic_dataset

        dataset = _generate_synthetic_dataset(50)
        self.assertEqual(len(dataset), 50)

    def test_training_with_synthetic_data(self):
        """Test that training runs without errors on synthetic data."""
        import torch
        from train import AttackClassifier, _generate_synthetic_dataset

        dataset = _generate_synthetic_dataset(100)
        from torch.utils.data import DataLoader

        loader = DataLoader(dataset, batch_size=16, shuffle=True)
        model = AttackClassifier(input_dim=8, n_classes=5)
        criterion = torch.nn.CrossEntropyLoss()
        optimizer = torch.optim.Adam(model.parameters())

        # Run one epoch
        model.train()
        for features, labels in loader:
            labels = torch.tensor(labels, dtype=torch.long)
            output = model(features)
            loss = criterion(output, labels)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

        self.assertIsNotNone(loss)


class TestResponseEngine(unittest.TestCase):
    """Tests for the simulated response engine."""

    def test_tarpit_response(self):
        """Test tarpit generates a log entry."""
        from sim_response import TarpitResponse

        tarpit = TarpitResponse()
        result = tarpit.engage("10.0.0.1", delay_seconds=1.0)
        self.assertEqual(result["action"], "tarpit")
        self.assertTrue(result["simulated"])

    def test_fake_shell_response(self):
        """Test fake shell returns expected responses."""
        from sim_response import FakeShellResponse

        shell = FakeShellResponse()
        result = shell.process_command("10.0.0.1", "whoami")
        self.assertEqual(result["action"], "fake_shell")
        self.assertEqual(result["fake_response"], "root")

    def test_fake_shell_unknown_command(self):
        """Test fake shell handles unknown commands."""
        from sim_response import FakeShellResponse

        shell = FakeShellResponse()
        result = shell.process_command("10.0.0.1", "nonexistent")
        self.assertIn("command not found", result["fake_response"])

    def test_decoy_filesystem(self):
        """Test decoy filesystem serves fake files."""
        from sim_response import DecoyFilesystem

        decoy = DecoyFilesystem()
        result = decoy.serve_file("10.0.0.1", "/root/.ssh/id_rsa")
        self.assertTrue(result["served_decoy"])

    def test_containment_zone(self):
        """Test containment zone tracks IPs."""
        from sim_response import ContainmentZone

        zone = ContainmentZone()
        self.assertFalse(zone.is_contained("10.0.0.1"))
        zone.contain("10.0.0.1", "test")
        self.assertTrue(zone.is_contained("10.0.0.1"))

    def test_orchestrator_low_threat(self):
        """Test orchestrator returns no actions for low threats."""
        from sim_response import ResponseOrchestrator

        orch = ResponseOrchestrator()
        result = orch.respond(
            {
                "input": {"ip": "10.0.0.1"},
                "analysis": {"classification": {"label": "benign"}},
                "threat_score": 5,
            }
        )
        self.assertEqual(len(result), 0)

    def test_orchestrator_high_threat(self):
        """Test orchestrator engages responses for high threats."""
        from sim_response import ResponseOrchestrator

        orch = ResponseOrchestrator()
        result = orch.respond(
            {
                "input": {"ip": "10.0.0.1"},
                "analysis": {"classification": {"label": "brute_force"}},
                "threat_score": 70,
            }
        )
        self.assertGreater(len(result), 0)
        actions = [r["action"] for r in result]
        self.assertIn("tarpit", actions)


class TestInferencePipeline(unittest.TestCase):
    """Tests for the inference pipeline."""

    @classmethod
    def setUpClass(cls):
        try:
            import torch
        except ImportError:
            raise unittest.SkipTest("torch is not installed; skipping PyTorch inference tests")

    def test_threat_score_computation(self):
        """Test threat score calculation."""
        from inference import _compute_threat_score

        # Benign analysis
        score = _compute_threat_score(
            {
                "binary": {"is_malicious": False, "confidence": 0.9},
                "classification": {"label": "benign", "confidence": 0.9},
            }
        )
        self.assertLessEqual(score, 20)

        # Malicious analysis
        score = _compute_threat_score(
            {
                "binary": {"is_malicious": True, "confidence": 0.95},
                "classification": {"label": "injection", "confidence": 0.9},
                "anomaly": {"is_anomaly": True},
            }
        )
        self.assertGreater(score, 50)


class TestLogFormat(unittest.TestCase):
    """Tests for log format consistency."""

    def test_example_logs_valid_json(self):
        """Test that example log files contain valid JSON."""
        log_dir = os.path.join(os.path.dirname(__file__), "..", "logs")
        # Each entry: (filepath, required_field)
        # Cowrie uses "timestamp"; OpenCanary uses "utc_time"
        log_files = [
            (os.path.join(log_dir, "opencanary", "opencanary.log"), "utc_time"),
            (os.path.join(log_dir, "cowrie", "cowrie.json"), "timestamp"),
        ]

        for log_file, required_field in log_files:
            if not os.path.exists(log_file):
                continue
            with open(log_file) as f:
                for i, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                        self.assertIsInstance(entry, dict)
                        self.assertIn(required_field, entry)
                    except json.JSONDecodeError:
                        self.fail(f"Invalid JSON in {log_file} line {i}")


if __name__ == "__main__":
    unittest.main()
