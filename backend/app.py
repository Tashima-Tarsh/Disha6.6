#!/usr/bin/env python3
"""
DISHA 6.6 — OSINT-ONE Cyber Surveillance Backend
FastAPI microservice with all OSINT collectors, SQLite identity graph,
Vyuh defensive formations, offensive cyber tools, and live surveillance.

Constitutional security (Article V):
- Authentication fails closed (DISHA_OSINT_API_KEY required)
- CORS restricted to explicit origins
- Path operations sandboxed to DISHA_DATA_ROOT
"""
import asyncio, json, os, sys, hashlib, shutil, subprocess, time, re, csv
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from fastapi import FastAPI, Depends
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from secure_bootstrap import (
    apply_security,
    require_api_key,
    ensure_inside_workspace,
    ensure_directory_inside_workspace,
)

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = HERE
sys.path.insert(0, HERE)
sys.path.insert(0, REPO)

PORT = int(os.environ.get("PORT", 8000))
UA = {"User-Agent": "DISHA-6.6/OSINT-ONE/2.0 (+https://localhost)"}
T = 25
POOL = ThreadPoolExecutor(max_workers=16)
FETCH_POOL = ThreadPoolExecutor(max_workers=16, thread_name_prefix="fetch")

REGISTRY: List[dict] = []

app = FastAPI(title="DISHA 6.6 OSINT-ONE Cyber Surveillance")
apply_security(app)  # restricted CORS + constitutional defaults


def collector(name, inputs, category, unmasked=False):
    def deco(fn):
        REGISTRY.append(dict(name=name, inputs=inputs, category=category, fn=fn, unmasked=unmasked))
        return fn
    return deco


# ======================== FETCH HELPERS ========================
def _get(url, headers=None):
    h = dict(UA); h.update(headers or {})
    def _do():
        with urlopen(Request(url, headers=h), timeout=T) as r:
            return r.read().decode("utf-8", "replace"), r.status
    try:
        fut = FETCH_POOL.submit(_do)
        return fut.result(timeout=T)
    except HTTPError as e:
        return (e.read().decode("utf-8", "replace") if e.fp else ""), e.code
    except URLError as e:
        return f"ERR {e.reason}", 0
    except Exception as e:
        return f"ERR {e}", 0


def _json(url):
    b, _ = _get(url)
    try: return json.loads(b)
    except Exception: return {"_raw": b}


def _exists(url):
    return _get(url)[1] == 200


def run_tool(cmd, timeout=300):
    if not shutil.which(cmd[0]):
        return None
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return ((p.stdout or "") + (p.stderr or "")).strip()[:20000] or "(no output)"
    except Exception as e:
        return f"ERR {e}"


def safe(c, v):
    try:
        return c["fn"](v)
    except Exception as e:
        return f"ERR {e}"


def plan(v):
    provided = {k for k, val in v.items() if val}
    return [c for c in REGISTRY if set(c["inputs"]) & provided]
