#!/usr/bin/env python3
"""
Bridge OSINT scan results → Constitutional EvidenceEvents.

Does not require the Node packages at runtime. Emits canonical JSON
EvidenceEvents that the Ledger / Orchestrator can ingest.

IMPORTANT:
- These events are OBSERVED proposals only.
- This module does NOT append to the authoritative TypeScript/Postgres ledger.
- Hashing here uses a simplified payload structure so the Node ledger must
  re-hash on ingest (ledger.append recomputes previousHash + hash).
- Within a single call, previousHash is chained so a batch is locally ordered.
"""
from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def _ulid_like() -> str:
    return uuid.uuid4().hex


def _hash_event(event_id: str, previous_hash: str, timestamp: str, payload: Any) -> str:
    raw = json.dumps(
        {
            "id": event_id,
            "previousHash": previous_hash,
            "ts": timestamp,
            "payload": payload,
        },
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def observations_to_evidence_events(
    *,
    results: Dict[str, Any],
    inputs: Dict[str, Any],
    mission_id: Optional[str] = None,
    actor_id: str = "osint-backend",
) -> List[Dict[str, Any]]:
    """Convert collector results into EvidenceEvent-shaped dicts (OBSERVED).

    Sensitive input values (e.g. password) are redacted from stored inputs.
    """
    events: List[Dict[str, Any]] = []
    ts = datetime.now(timezone.utc).isoformat()
    prev = "0"

    # Redact secrets from the inputs snapshot stored on evidence.
    safe_inputs = {
        k: ("[REDACTED]" if k.lower() in ("password", "passwd", "secret", "token", "api_key") else v)
        for k, v in inputs.items()
    }

    for name, value in results.items():
        if value is None:
            continue
        if isinstance(value, str) and value.startswith("ERR "):
            continue
        eid = _ulid_like()
        payload = {"collector": name, "inputs": safe_inputs, "result": value}
        h = _hash_event(eid, prev, ts, payload)
        events.append({
            "id": eid,
            "previousHash": prev,
            "hash": h,
            "timestamp": ts,
            "actor": {"type": "adapter", "id": actor_id, "displayName": name},
            "type": "observation",
            "payload": payload,
            "sources": [{"adapterId": f"osint:{name}", "retrievedAt": ts}],
            "verification": "OBSERVED",
            "policyContext": {
                "policyId": "osint-public-or-authorized",
                "decision": "allow",
                "reasons": ["Emitted from governed OSINT backend (proposal only; ledger re-hashes on ingest)"],
            },
            "missionId": mission_id,
            "ledgerNote": "proposal_only_not_persisted",
        })
        prev = h
    return events
