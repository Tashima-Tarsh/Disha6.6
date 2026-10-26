from __future__ import annotations

import sys

sys.path.insert(0, ".")

from packages.skills.superpowers.superpowers_engine import SuperpowersEngine


def test_superpowers_systematic_debugging() -> None:
    engine = SuperpowersEngine()
    # Test reproduction of an intentional exit 1 failure
    result = engine.systematic_debug(
        failure_desc="Controlled non-zero test command",
        reproduction_cmd="python -c \"exit(1)\"",
    )
    assert result["reproduced"] is True
    assert result["status"] == "REPRODUCED"
    assert result["exit_code"] == 1


def test_superpowers_tdd_cycle() -> None:
    engine = SuperpowersEngine()
    # Test TDD cycle against an existing passing test
    result = engine.tdd_cycle(
        test_cmd="python -m pytest tests/test_disha_memory_persistence.py",
    )
    assert result["passed"] is True
    assert result["exit_code"] == 0

