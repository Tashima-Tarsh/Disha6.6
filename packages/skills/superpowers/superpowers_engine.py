"""
DISHA 6.6 — Superpowers Engineering Workflow Adapter
Inspired by obra/superpowers (TDD, systematic debugging, structured review).
"""
from __future__ import annotations

import subprocess
import time
from typing import Any, Dict, List


class SuperpowersEngine:
    def __init__(self) -> None:
        self.history: List[Dict[str, Any]] = []

    def systematic_debug(self, failure_desc: str, reproduction_cmd: str) -> Dict[str, Any]:
        """
        Executes systematic debugging lifecycle:
        1. REPRODUCE: run reproduction_cmd to confirm failure
        2. DIAGNOSE: capture stderr and returncode
        3. ROOT_CAUSE: extract diagnostic trace
        """
        start = time.time()
        # Safe reproduction in current repo
        p = subprocess.run(
            reproduction_cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30,
        )
        duration = time.time() - start

        result = {
            "workflow": "systematic_debug",
            "failure_desc": failure_desc,
            "reproduction_cmd": reproduction_cmd,
            "reproduced": p.returncode != 0,
            "exit_code": p.returncode,
            "stdout": p.stdout[:2000],
            "stderr": p.stderr[:2000],
            "duration_s": round(duration, 3),
            "status": "REPRODUCED" if p.returncode != 0 else "NOT_REPRODUCED",
        }
        self.history.append(result)
        return result

    def tdd_cycle(self, test_cmd: str, candidate_patch_file: str | None = None) -> Dict[str, Any]:
        """
        Executes Test-Driven Development verification:
        Ensures tests are run and verified objectively.
        """
        p = subprocess.run(
            test_cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=60,
        )
        return {
            "workflow": "test_driven_development",
            "test_cmd": test_cmd,
            "passed": p.returncode == 0,
            "exit_code": p.returncode,
            "output_snippet": (p.stdout or p.stderr)[:1000],
        }

