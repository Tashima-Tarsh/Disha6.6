#!/usr/bin/env python3
"""
Bridge OSINT scan results → Constitutional EvidenceEvents.

Does not require the Node packages at runtime. Emits canonical JSON
EvidenceEvents that the Ledger / Orchestrator can ingest.
"""
from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def _ulid_like() -> str:
    return uuid.uuid4().hex


def _hash_event(event_id: str, timestamp: str, payload: Any) -> str:
    raw = json.dumps({"id": event_id, "ts": timestamp, "payload": payload}, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def observations_to_evidence_events(
    *,
    results: Dict[str, Any],
    inputs: Dict[str, Any],
    mission_id: Optional[str] = None,
    actor_id: str = "osint-backend",
) -> List[Dict[str, Any]]:
    """Convert collector results into EvidenceEvent-shaped dicts (OBSERVED)."""
    events: List[Dict[str, Any]] = []
    ts = datetime.now(timezone.utc).isoformat()
    for name, value in results.items():
        if value is None:
            continue
        if isinstance(value, str) and value.startswith("ERR "):
            continue
        eid = _ulid_like()
        payload = {"collector": name, "inputs": inputs, "result": value}
        events.append({
            "id": eid,
            "previousHash": "0",
            "hash": _hash_event(eid, ts, payload),
            "timestamp": ts,
            "actor": {"type": "adapter", "id": actor_id, "displayName": name},
            "type": "observation",
            "payload": payload,
            "sources": [{"adapterId": f"osint:{name}", "retrievedAt": ts}],
            "verification": "OBSERVED",
            "policyContext": {
                "policyId": "osint-public-or-authorized",
                "decision": "allow",
                "reasons": ["Emitted from governed OSINT backend"],
            },
            "missionId": mission_id,
        })
    return events
