#!/usr/bin/env python3
"""
DISHA 6.6 — OSINT Backend (Constitutionally secured)

- Full collector registry (osint_collectors)
- Identity graph (osint_graph)
- Vyuha formations: PROPOSAL-ONLY
- Evidence bridge: scan → EvidenceEvent JSON (PII redacted in ledger proposals)
- UI responses: inputsDisplay keeps identity PII; secrets always redacted
- /tools and /tools/status: executable + actionable flags per collector
"""
from __future__ import annotations

import os
import sys
from typing import Any

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from evidence_bridge import append_evidence_events, verify_chain, get_events_for_mission, export_chain
from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from osint_collectors import (
    REGISTRY,
    inputs_for_display,
    list_tools_status,
    plan,
    redact_for_log,
    safe,
)
from osint_graph import (
    DB_PATH,
    detect_kind,
    load_all,
    load_file,
    sg_connect,
    sg_init,
    sg_resolve,
)
from pydantic import BaseModel, Field
from secure_bootstrap import (
    apply_security,
    ensure_directory_inside_workspace,
    ensure_inside_workspace,
    require_api_key,
)
from vyuha_formations import COLLECTOR_NAME_MAP, VYUH_FORMATIONS

# Constitutional boot: fail-closed before the app serves any request.
BOOT_CONFIG = None  # type: ignore
try:
    from constitutional_boot import BOOT_CONFIG  # noqa: E402
except Exception as _boot_exc:  # pragma: no cover - fail closed
    BOOT_CONFIG = {"boot_error": str(_boot_exc)}

PORT = int(os.environ.get("PORT", 8000))

app = FastAPI(title="DISHA 6.6 OSINT-ONE Cyber Surveillance")
apply_security(app)


class ScanInput(BaseModel):
    email: str | None = None
    username: str | None = None
    domain: str | None = None
    ip: str | None = None
    phone: str | None = None
    password: str | None = None
    name: str | None = None
    vehicle: str | None = None
    epic: str | None = None
    pan: str | None = None
    aadhaar: str | None = None
    keyword: str | None = None
    lat: float | None = None
    lon: float | None = None
    timestamp: str | None = None
    live: bool | None = None
    missionId: str | None = None
    allowActive: bool = Field(
        default=False,
        description="Must be true to run active_network collectors. Default false.",
    )


@app.get("/")
def root():
    return {
        "service": "DISHA 6.6 OSINT",
        "constitutional": True,
        "auth": "Bearer DISHA_OSINT_API_KEY required on sensitive routes",
        "policy": {
            "activeNetworkDefault": "deny",
            "allowActiveField": "allowActive",
        },
    }


@app.get("/boot")
def boot():
    """Constitutional boot status (no secrets exposed)."""
    return {
        "boot": BOOT_CONFIG if isinstance(BOOT_CONFIG, dict) else {"error": str(BOOT_CONFIG)},
        "constitutional": True,
    }


@app.get("/api/v1/evidence/verify/{mission_id}", dependencies=[Depends(require_api_key)])
def evidence_verify(mission_id: str):
    """Verify the hash-chain integrity of all evidence events for a mission."""
    result = verify_chain(mission_id)
    return {"missionId": mission_id, **result}


@app.get("/api/v1/evidence/export/{mission_id}", dependencies=[Depends(require_api_key)])
def evidence_export(mission_id: str):
    """Export a complete, verifiable evidence package for a mission (reconstructibility)."""
    return export_chain(mission_id)


@app.get("/tools", dependencies=[Depends(require_api_key)])
def tools():
    """Catalog of collectors with executable/actionable status."""
    status = list_tools_status()
    return {
        "collectors": status,
        "summary": {
            "total": len(status),
            "ready": sum(1 for t in status if t.get("status") == "ready"),
            "not_installed": sum(1 for t in status if t.get("status") == "not_installed"),
        },
        "note": (
            "This is the executable OSINT surface (~36). "
            "A larger upstream discovery catalog is not the same as a runnable fleet."
        ),
    }


@app.get("/tools/status", dependencies=[Depends(require_api_key)])
def tools_status():
    status = list_tools_status()
    return {
        "collectors": status,
        "summary": {
            "total": len(status),
            "ready": sum(1 for t in status if t.get("status") == "ready"),
            "not_installed": sum(1 for t in status if t.get("status") == "not_installed"),
            "shell": [t for t in status if t.get("kind") == "shell"],
        },
    }


@app.post("/scan", dependencies=[Depends(require_api_key)])
async def scan(payload: ScanInput):
    v = payload.model_dump(exclude_none=True)
    mission_id = v.pop("missionId", None)
    allow_active = bool(v.pop("allowActive", False))

    chosen = plan(v, allow_active=allow_active)
    denied = []
    if not allow_active:
        would = plan(v, allow_active=True)
        denied = [
            {"name": c["name"], "risk": c.get("risk"), "reason": "allowActive required"}
            for c in would
            if c.get("risk") == "active_network"
        ]

    results: dict[str, Any] = {}
    for c in chosen:
        results[c["name"]] = safe(c, v)

    # Evidence always uses log-redacted inputs (PII + secrets).
    # Persisted to the real hash-chained ledger; fail closed if the write fails.
    evidence_events = append_evidence_events(
        results=results, inputs=v, mission_id=mission_id
    )

    return {
        # On-screen / operator UI: identity PII visible; secrets hidden.
        "inputsDisplay": inputs_for_display(v),
        # Logs / print / export: full redaction of PII + secrets.
        "inputsRedacted": redact_for_log(v),
        # Backward-compatible alias of redacted (safe default for old clients).
        "inputs": redact_for_log(v),
        "ran": len(results),
        "results": results,
        "deniedByPolicy": denied,
        "allowActive": allow_active,
        "evidenceEvents": evidence_events,
        "evidenceCount": len(evidence_events),
        "missionId": mission_id,
    }


@app.get("/api/v1/graph/stats", dependencies=[Depends(require_api_key)])
def graph_stats():
    try:
        conn = sg_connect()
        sg_init(conn)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM identifier")
        ids = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM edge")
        edges = cur.fetchone()[0]
        cur.execute("SELECT COUNT(DISTINCT source) FROM identifier")
        sources = cur.fetchone()[0]
        cur.execute(
            "SELECT kind, COUNT(*) FROM identifier GROUP BY kind ORDER BY COUNT(*) DESC LIMIT 10"
        )
        by_kind = [{"kind": r[0], "count": r[1]} for r in cur.fetchall()]
        conn.close()
        return {
            "db": DB_PATH,
            "identifiers": ids,
            "edges": edges,
            "sources": sources,
            "by_kind": by_kind,
        }
    except Exception as e:
        return {"error": str(e), "db": DB_PATH}


@app.post("/api/v1/data/load", dependencies=[Depends(require_api_key)])
def data_load(payload: dict):
    path = payload.get("path")
    directory = payload.get("directory")
    source = payload.get("source", "upload")
    dry = payload.get("dry", False)
    limit = payload.get("limit")
    try:
        conn = sg_connect()
        sg_init(conn)
        if directory:
            safe_dir = ensure_directory_inside_workspace(directory)
            result = load_all(conn, str(safe_dir), limit_per_file=limit, dry=dry)
        elif path:
            safe_path = ensure_inside_workspace(path)
            if not safe_path.exists():
                return JSONResponse({"error": "file not found"}, status_code=400)
            result = load_file(conn, str(safe_path), source, limit=limit, dry=dry)
        else:
            return JSONResponse({"error": "path or directory required"}, status_code=400)
        conn.close()
        return result
    except PermissionError as e:
        return JSONResponse({"error": str(e)}, status_code=403)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/v1/resolve", dependencies=[Depends(require_api_key)])
def resolve_one(payload: dict):
    q = payload.get("q", "")
    if not q:
        return JSONResponse({"error": "q required"}, status_code=400)
    try:
        conn = sg_connect()
        sg_init(conn)
        kind, value = detect_kind(q)
        out = sg_resolve(conn, kind, value)
        conn.close()
        return out
    except Exception as e:
        return {"error": str(e), "hint": "load CSVs first via /api/v1/data/load"}


class LeakCheckQuery(BaseModel):
    query: str
    type: str | None = None
    limit: int = 100
    offset: int = 0
    apiKey: str | None = None


def run_leakcheck_lookup(query: str, query_type: str | None = None, limit: int = 100, offset: int = 0, explicit_key: str | None = None):
    try:
        import leakcheck
    except ImportError:
        leakcheck = None

    q = (query or "").strip()
    if not q:
        return {"success": False, "error": "query cannot be empty"}
    api_key = explicit_key or os.getenv("LEAKCHECK_APIKEY")
    try:
        if leakcheck is not None and api_key and len(api_key) >= 40:
            client = leakcheck.LeakCheckAPI_v2(api_key=api_key)
            res = client.lookup(q, query_type=query_type, limit=min(limit, 1000), offset=min(offset, 2500))
            return {
                "success": True,
                "tier": "pro_v2",
                "target": q,
                "type": query_type or "auto",
                "found": len(res) if isinstance(res, list) else 0,
                "result": res if isinstance(res, list) else [],
            }
        elif leakcheck is not None:
            client = leakcheck.LeakCheckAPI_Public()
            res = client.lookup(q)
            return {
                "success": res.get("success", False),
                "tier": "public",
                "target": q,
                "found": res.get("found", 0),
                "fields": res.get("fields", []),
                "sources": res.get("sources", []),
            }
        else:
            import json as _j
            from urllib.parse import quote
            from urllib.request import Request as _Req
            from urllib.request import urlopen as _uo
            req = _Req(f"https://leakcheck.io/api/public?check={quote(q)}", headers={"User-Agent": "PyLCAPI/2.0.0"})
            with _uo(req, timeout=20) as resp:
                data = _j.loads(resp.read().decode())
                return {
                    "success": data.get("success", False),
                    "tier": "public_direct",
                    "target": q,
                    "found": data.get("found", 0),
                    "fields": data.get("fields", []),
                    "sources": data.get("sources", []),
                }
    except Exception as e:
        return {"success": False, "error": str(e), "target": q}


@app.post("/api/v1/leakcheck/lookup", dependencies=[Depends(require_api_key)])
def leakcheck_lookup_post(payload: LeakCheckQuery):
    return run_leakcheck_lookup(payload.query, payload.type, payload.limit, payload.offset, payload.apiKey)


@app.get("/api/v1/leakcheck/lookup", dependencies=[Depends(require_api_key)])
def leakcheck_lookup_get(
    query: str,
    type: str | None = None,
    limit: int = 100,
    offset: int = 0,
    apiKey: str | None = None
):
    return run_leakcheck_lookup(query, type, limit, offset, apiKey)


@app.get("/api/v1/vyuh/formations", dependencies=[Depends(require_api_key)])
def vyuh_formations():
    return {
        "mode": "proposal_only",
        "note": "Vyuha is advisory under the Constitution.",
        "formations": VYUH_FORMATIONS,
    }


@app.post("/api/v1/vyuh/activate", dependencies=[Depends(require_api_key)])
def vyuh_activate(payload: dict):
    formation_id = payload.get("formation_id")
    inputs = payload.get("inputs", {}) or {}
    mission_id = payload.get("missionId")
    allow_active = bool(payload.get("allowActive", False))
    if formation_id not in VYUH_FORMATIONS:
        return JSONResponse({"error": "unknown formation"}, status_code=400)
    formation = VYUH_FORMATIONS[formation_id]
    results = {}
    for coll_name in formation.get("collectors", []):
        reg_name = COLLECTOR_NAME_MAP.get(coll_name)
        if reg_name is None:
            results[coll_name] = {
                "status": "proposal",
                "note": "No direct collector mapping; advisory only",
            }
            continue
        match = next((c for c in REGISTRY if c["name"] == reg_name), None)
        if not match:
            results[coll_name] = {"status": "not_installed"}
            continue
        if match.get("risk") == "active_network" and not allow_active:
            results[reg_name] = {
                "status": "denied_by_policy",
                "reason": "active_network requires allowActive=true",
            }
            continue
        results[reg_name] = safe(match, inputs)
    evidence_events = append_evidence_events(
        results={
            k: v
            for k, v in results.items()
            if not isinstance(v, dict)
            or v.get("status") not in ("proposal", "not_installed", "denied_by_policy")
        },
        inputs=inputs,
        mission_id=mission_id,
        actor_id=f"vyuha:{formation_id}",
    )
    return {
        "mode": "proposal_only",
        "formation": formation_id,
        "name": formation.get("name"),
        "purpose": formation.get("purpose"),
        "results": results,
        "inputsDisplay": inputs_for_display(inputs),
        "inputsRedacted": redact_for_log(inputs),
        "allowActive": allow_active,
        "evidenceEvents": evidence_events,
        "evidenceCount": len(evidence_events),
        "constitutional": {
            "highRisk": "blocked",
            "verification": "OBSERVED only — human review required for VERIFIED",
            "activeNetworkDefault": "deny",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
