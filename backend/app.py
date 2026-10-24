#!/usr/bin/env python3
"""DISHA OSINT backend — constitutional security (Article V). Loads implementation parts."""
from pathlib import Path

_dir = Path(__file__).resolve().parent
_code = (_dir / "_app_part_a.py").read_text() + (_dir / "_app_part_b.py").read_text()
exec(compile(_code, str(_dir / "app_impl.py"), "exec"), globals())
