from __future__ import annotations

import os
import sys
import tempfile

sys.path.insert(0, ".")

from packages.autonomous.self_healing_engine import SelfHealingEngine


def test_autonomous_self_healing_full_lifecycle() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a controlled target python script with a deliberate synthetic defect
        target_script = os.path.join(tmpdir, "calculator.py")
        with open(target_script, "w", encoding="utf-8") as f:
            f.write("""def calculate_metric(a: int, b: int) -> int:
    return a + b
""")

        # Create a test script that validates the metric must be a * b
        test_script = os.path.join(tmpdir, "test_calculator.py")
        with open(test_script, "w", encoding="utf-8") as f:
            f.write(f"""import sys
sys.path.insert(0, r"{tmpdir}")
from calculator import calculate_metric

assert calculate_metric(4, 5) == 20, "Calculation must equal 20"
print("SUCCESS: metric verified")
""")

        py_exe = sys.executable
        repro_cmd = f'"{py_exe}" -B "{test_script}"'
        test_cmd = repro_cmd

        engine = SelfHealingEngine()

        # Run self-healing cycle:
        # Detect -> Reproduce -> Plan Fix -> Patch -> Test -> Verify
        trace = engine.run_healing_cycle(
            failure_desc="Calculation metric assertion mismatch",
            target_file=target_script,
            repro_cmd=repro_cmd,
            test_cmd=test_cmd,
            bad_token="return a + b",
            fixed_token="return a * b",
        )

        assert trace["phases"]["detect"]["status"] == "DETECTED"
        assert trace["phases"]["reproduce"]["status"] == "REPRODUCED"
        assert trace["phases"]["patch"]["status"] == "PATCH_APPLIED"
        assert trace["phases"]["test"]["status"] == "TEST_PASSED"
        assert trace["status"] == "HEALED_VERIFIED"

        # Verify target file has indeed been repaired
        with open(target_script, "r", encoding="utf-8") as f:
            content = f.read()
        assert "return a * b" in content

