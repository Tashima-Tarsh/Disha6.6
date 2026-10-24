#!/usr/bin/env python3
"""
DISHA OSINT backend entrypoint.
Loads the constitutional implementation (auth fail-closed, CORS, path sandbox).
"""
from __future__ import annotations

import base64
import zlib
from pathlib import Path

_payload = Path(__file__).with_name("_app_secure.b64z").read_text().strip()
_code = zlib.decompress(base64.b64decode(_payload)).decode("utf-8")
exec(compile(_code, str(Path(__file__).with_name("app_impl.py")), "exec"), globals())
