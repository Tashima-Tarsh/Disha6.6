#!/usr/bin/env python3
"""
DISHA 6.6 — OSINT Backend (Constitutionally secured)

- Full collector registry (osint_collectors)
- Identity graph (osint_graph)
- Vyuha formations: PROPOSAL-ONLY (no autonomous high-risk execution)
- Evidence bridge: scan results → EvidenceEvent JSON for the Ledger
- Fail-closed auth, restricted CORS, path sandbox
"""
from __future__ import annotations

import os
import sys
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from secure_bootstrap import (
    apply_security,
    ensure_directory_inside_workspace,
    ensure_inside_workspace,
    require_api_key,
)
from osint_collectors import REGISTRY, safe, plan
from osint_graph import (
    DB_PATH,
    sg_connect,
    sg_init,
    sg_resolve,
    load_file,
    load_all,
    detect_kind,
)
from vyuha_formations import VYUH_FORMATIONS, COLLECTOR_NAME_MAP
from evidence_bridge import observations_to_evidence_events

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

PORT = int(os.environ.get("PORT", 8000))

app = FastAPI(title="DISHA 6.6 OSINT-ONE Cyber Surveillance")
apply_security(app)


class ScanInput(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    domain: Optional[str] = None
    ip: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    name: Optional[str] = None
    vehicle: Optional[str] = None
    epic: Optional[str] = None
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    keyword: Optional[str] = None
    live: Optional[bool] = None
    missionId: Optional[str] = None


@app.get("/")
def root():
    return {
        "service": "DISHA 6.6 OSINT",
        "constitutional": True,
        "auth": "Bearer DISHA_OSINT_API_KEY required on sensitive routes",
        "collectors": len(REGISTRY),
        "vyuhaFormations": len(VYUH_FORMATIONS),
        "vyuhaMode": "proposal_only",
        "evidenceBridge": True,
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
    mission_id = v.pop("missionId", None)
    chosen = plan(v)
    results: Dict[str, Any] = {}
    for c in chosen:
        results[c["name"]] = safe(c, v)
    evidence_events = observations_to_evidence_events(
        results=results, inputs=v, mission_id=mission_id
    )
    return {
        "inputs": v,
        "ran": len(results),
        "results": results,
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


@app.get("/api/v1/vyuh/formations", dependencies=[Depends(require_api_key)])
def vyuh_formations():
    return {
        "mode": "proposal_only",
        "note": "Vyuha is advisory under the Constitution. Activation never executes high-risk actions autonomously.",
        "formations": VYUH_FORMATIONS,
    }


@app.post("/api/v1/vyuh/activate", dependencies=[Depends(require_api_key)])
def vyuh_activate(payload: dict):
    """Proposal-only: runs only mapped collectors and returns a proposal + evidence."""
    formation_id = payload.get("formation_id")
    inputs = payload.get("inputs", {})
    mission_id = payload.get("missionId")
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
        results[reg_name] = safe(match, inputs)
    evidence_events = observations_to_evidence_events(
        results={
            k: v
            for k, v in results.items()
            if not isinstance(v, dict) or v.get("status") not in ("proposal", "not_installed")
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
        "evidenceEvents": evidence_events,
        "evidenceCount": len(evidence_events),
        "constitutional": {
            "highRisk": "blocked",
            "verification": "OBSERVED only — human review required for VERIFIED",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
