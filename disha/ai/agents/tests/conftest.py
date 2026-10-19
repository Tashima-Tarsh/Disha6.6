"""Ensure the agent_core package is importable for tests by aliasing to disha.ai.agents."""

import importlib
import sys
from pathlib import Path

_repo_root = Path(__file__).resolve().parents[4]
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

agents_pkg = importlib.import_module("disha.ai.agents")
sys.modules["agent_core"] = agents_pkg
for mod_name in ["agent", "config", "controller", "executor", "memory", "planner", "tools", "types"]:
    sys.modules[f"agent_core.{mod_name}"] = importlib.import_module(f"disha.ai.agents.{mod_name}")
