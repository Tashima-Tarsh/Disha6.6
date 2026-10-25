"""
DISHA 6.6 — Autonomous Self-Healing and Code Repair Engine
Inspired by OpenHands (OpenHands/OpenHands).
Lifecycle: DETECT -> DIAGNOSE -> REPRODUCE -> PLAN FIX -> CREATE PATCH -> TEST -> REVIEW -> RELEASE -> ROLLBACK
"""
from __future__ import annotations

import os
import shutil
import subprocess
import time
from typing import Any, Dict


class SelfHealingEngine:
    def __init__(self, workspace_root: str = ".") -> None:
        self.workspace_root = workspace_root
        self.repair_history: list[Dict[str, Any]] = []

    def run_healing_cycle(
        self,
        failure_desc: str,
        target_file: str,
        repro_cmd: str,
        test_cmd: str,
        bad_token: str,
        fixed_token: str,
    ) -> Dict[str, Any]:
        """
        Executes an end-to-end self-healing cycle on a controlled target file.
        """
        trace: Dict[str, Any] = {
            "failure_desc": failure_desc,
            "target_file": target_file,
            "timestamp": time.time(),
            "phases": {},
        }

        # 1. DETECT & DIAGNOSE
        trace["phases"]["detect"] = {
            "status": "DETECTED",
            "description": failure_desc,
        }

        # 2. REPRODUCE
        p_repro = subprocess.run(
            repro_cmd, shell=True, capture_output=True, text=True, timeout=30
        )
        if p_repro.returncode == 0:
            trace["phases"]["reproduce"] = {
                "status": "NOT_REPRODUCED",
                "exit_code": 0,
            }
            return trace

        trace["phases"]["reproduce"] = {
            "status": "REPRODUCED",
            "exit_code": p_repro.returncode,
            "error_output": (p_repro.stderr or p_repro.stdout)[:500],
        }

        # 3. PLAN FIX & BACKUP FOR ROLLBACK
        backup_path = f"{target_file}.selfheal_bak"
        shutil.copyfile(target_file, backup_path)
        trace["phases"]["plan_fix"] = {
            "status": "PLANNED",
            "strategy": f"Replace '{bad_token}' with '{fixed_token}' in {target_file}",
            "backup_created": backup_path,
        }

        # 4. CREATE PATCH
        with open(target_file, "r", encoding="utf-8") as f:
            original_content = f.read()

        patched_content = original_content.replace(bad_token, fixed_token)
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(patched_content)

        trace["phases"]["patch"] = {
            "status": "PATCH_APPLIED",
            "bytes_changed": abs(len(patched_content) - len(original_content)),
        }

        # 5. TEST
        p_test = subprocess.run(
            test_cmd, shell=True, capture_output=True, text=True, timeout=60
        )
        if p_test.returncode == 0:
            trace["phases"]["test"] = {
                "status": "TEST_PASSED",
                "exit_code": 0,
            }
            trace["status"] = "HEALED_VERIFIED"
            # Cleanup backup on confirmed fix
            if os.path.exists(backup_path):
                os.remove(backup_path)
        else:
            trace["phases"]["test"] = {
                "status": "TEST_FAILED",
                "exit_code": p_test.returncode,
                "error_output": (p_test.stderr or p_test.stdout)[:500],
            }
            # 6. ROLLBACK
            shutil.copyfile(backup_path, target_file)
            if os.path.exists(backup_path):
                os.remove(backup_path)
            trace["phases"]["rollback"] = {
                "status": "ROLLED_BACK",
                "reason": "Test failed post-patch",
            }
            trace["status"] = "REPAIR_REVERTED"

        self.repair_history.append(trace)
        return trace

