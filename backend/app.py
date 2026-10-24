#!/usr/bin/env python3
"""
DISHA 6.6 — OSINT Backend (Constitutionally secured)

Fail-closed auth, restricted CORS, path sandbox (Article V).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import socket
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from secure_bootstrap import (
    apply_security,
    ensure_directory_inside_workspace,
    ensure_inside_workspace,
    require_api_key,
)

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

PORT = int(os.environ.get("PORT", 8000))
UA = {"User-Agent": "DISHA-6.6/OSINT-ONE/2.0 (+https://localhost)"}
T = 25
POOL = ThreadPoolExecutor(max_workers=16)
FETCH_POOL = ThreadPoolExecutor(max_workers=16, thread_name_prefix="fetch")
REGISTRY: List[dict] = []

app = FastAPI(title="DISHA 6.6 OSINT-ONE Cyber Surveillance")
apply_security(app)


def collector(name, inputs, category, unmasked=False):
    def deco(fn):
        REGISTRY.append(dict(name=name, inputs=inputs, category=category, fn=fn, unmasked=unmasked))
        return fn
    return deco


def _get(url, headers=None):
    h = dict(UA)
    h.update(headers or {})

    def _do():
        with urlopen(Request(url, headers=h), timeout=T) as r:
            return r.read().decode("utf-8", "replace"), r.status

    try:
        return FETCH_POOL.submit(_do).result(timeout=T)
    except HTTPError as e:
        return (e.read().decode("utf-8", "replace") if e.fp else ""), e.code
    except URLError as e:
        return f"ERR {e.reason}", 0
    except Exception as e:
        return f"ERR {e}", 0


def _json(url):
    b, _ = _get(url)
    try:
        return json.loads(b)
    except Exception:
        return {"_raw": b}


def _exists(url):
    return _get(url)[1] == 200


def safe(c, v):
    try:
        return c["fn"](v)
    except Exception as e:
        return f"ERR {e}"


def plan(v):
    provided = {k for k, val in v.items() if val}
    return [c for c in REGISTRY if set(c["inputs"]) & provided]


# ---- Public collectors (high-quality, legally clean) ----

@collector("GitHub", ["username"], "accounts")
def c_gh(v):
    return _json(f"https://api.github.com/users/{v['username']}")


@collector("GitLab", ["username"], "accounts")
def c_gl(v):
    return _json(f"https://gitlab.com/api/v4/users?username={v['username']}")


@collector("Reddit", ["username"], "accounts")
def c_rd(v):
    return _json(f"https://www.reddit.com/user/{v['username']}/about.json")


@collector("Keybase", ["username"], "accounts")
def c_kb(v):
    return _json(f"https://keybase.io/_/api/1.0/user/lookup.json?username={v['username']}")


@collector("Gravatar", ["email"], "accounts")
def c_grav(v):
    h = hashlib.md5(v["email"].strip().lower().encode()).hexdigest()
    return {
        "exists": _exists(f"https://www.gravatar.com/avatar/{h}?d=404"),
        "url": f"https://www.gravatar.com/avatar/{h}",
    }


@collector("Pwned Password (HIBP)", ["password"], "breach", unmasked=True)
def c_pwn(v):
    h = hashlib.sha1(v["password"].encode()).hexdigest().upper()
    body, _ = _get(f"https://api.pwnedpasswords.com/range/{h[:5]}")
    for line in body.splitlines():
        p = line.split(":")
        if len(p) == 2 and p[0].strip() == h[5:]:
            return {"seen": int(p[1]), "verdict": "COMPROMISED"}
    return {"seen": 0, "verdict": "clean"}


@collector("emailrep.io", ["email"], "breach")
def c_emailrep(v):
    return _json(f"https://emailrep.io/{v['email']}")


@collector("IP lookup (ipapi.co)", ["ip"], "infra")
def c_ip(v):
    return _json(f"https://ipapi.co/{v['ip']}/json/")


@collector("IP lookup (ipinfo.io)", ["ip"], "infra")
def c_ipinfo(v):
    return _json(f"https://ipinfo.io/{v['ip']}/json")


@collector("crt.sh certs", ["domain"], "infra")
def c_crt(v):
    return _json(f"https://crt.sh/?q=%25.{v['domain']}&output=json")


@collector("Wayback availability", ["domain"], "infra")
def c_wb(v):
    return _json(f"http://archive.org/wayback/available?url={v['domain']}")


@collector("DNS lookup", ["domain"], "offensive")
def c_off_dns(v):
    try:
        return {"domain": v["domain"], "a": socket.gethostbyname_ex(v["domain"])[2]}
    except Exception as e:
        return {"domain": v["domain"], "error": str(e)}


@collector("HTTP headers", ["domain"], "offensive")
def c_off_headers(v):
    try:
        b, code = _get(f"http://{v['domain']}", headers={"User-Agent": "DISHA/2.0"})
        return {"domain": v["domain"], "status": code, "headers_sample": b[:2000]}
    except Exception as e:
        return {"domain": v["domain"], "error": str(e)}


@collector("Live: GDELT India news", ["live", "keyword"], "live")
def c_gdelt(v):
    q = v.get("keyword") or "India"
    return _json(f"https://api.gdeltproject.org/api/v2/doc/doc?query={q}&format=json&maxrecords=20")


class ScanInput(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    domain: Optional[str] = None
    ip: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    keyword: Optional[str] = None
    live: Optional[bool] = None


@app.get("/")
def root():
    return {
        "service": "DISHA 6.6 OSINT",
        "constitutional": True,
        "auth": "Bearer DISHA_OSINT_API_KEY required on sensitive routes",
        "collectors": len(REGISTRY),
    }


@app.get("/tools")
def tools():
    return {
        "collectors": [
            {"name": c["name"], "inputs": c["inputs"], "category": c["category"]}
            for c in REGISTRY
        ]
    }


@app.post("/scan", dependencies=[Depends(require_api_key)])
async def scan(payload: ScanInput):
    v = payload.model_dump(exclude_none=True)
    chosen = plan(v)
    results = {}
    for c in chosen:
        results[c["name"]] = safe(c, v)
    return {"inputs": v, "ran": len(results), "results": results}


@app.get("/api/v1/graph/stats", dependencies=[Depends(require_api_key)])
def graph_stats():
    return {
        "note": "Identity graph requires CSV load via /api/v1/data/load",
        "collectors": len(REGISTRY),
    }


@app.post("/api/v1/data/load", dependencies=[Depends(require_api_key)])
def data_load(payload: dict):
    path = payload.get("path")
    directory = payload.get("directory")
    try:
        if directory:
            safe_dir = ensure_directory_inside_workspace(directory)
            return {"status": "ok", "directory": str(safe_dir), "note": "sandbox path resolved"}
        if path:
            safe_path = ensure_inside_workspace(path)
            if not safe_path.exists():
                return JSONResponse({"error": "file not found"}, status_code=400)
            return {"status": "ok", "path": str(safe_path), "note": "sandbox path resolved"}
        return JSONResponse({"error": "path or directory required"}, status_code=400)
    except PermissionError as e:
        return JSONResponse({"error": str(e)}, status_code=403)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/v1/resolve", dependencies=[Depends(require_api_key)])
def resolve_one(payload: dict):
    q = payload.get("q", "")
    if not q:
        return JSONResponse({"error": "q required"}, status_code=400)
    return {"q": q, "note": "Load identity CSVs first for full resolution", "collectors": len(REGISTRY)}


@app.get("/api/v1/vyuh/formations", dependencies=[Depends(require_api_key)])
def vyuh_formations():
    return {"formations": {}, "note": "Formations are advisory scaffolding; not production intelligence"}


@app.post("/api/v1/vyuh/activate", dependencies=[Depends(require_api_key)])
def vyuh_activate(payload: dict):
    return {
        "status": "proposal_only",
        "note": "High-risk actions are proposal-only under the Constitution",
        "payload_echo": payload,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
