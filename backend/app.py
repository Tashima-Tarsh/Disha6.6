#!/usr/bin/env python3
"""DISHA OSINT backend — constitutional security (Article V)."""
from __future__ import annotations

import base64
import zlib
from pathlib import Path

_dir = Path(__file__).resolve().parent
_payload = "".join(
    (_dir / f"_app_secure.b64z.part{i}").read_text().strip()
    for i in range(3)
)
_code = zlib.decompress(base64.b64decode(_payload)).decode("utf-8")
exec(compile(_code, str(_dir / "app_impl.py"), "exec"), globals())
