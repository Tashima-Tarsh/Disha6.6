#!/usr/bin/env python3
"""
Bridge OSINT scan results → Constitutional EvidenceEvents.

Persists every observation to a real, hash-chained, append-only evidence
ledger (SQLite) so observations are not mere proposals. The ledger is the
authoritative local store for the Python OSINT spine; events carry the same
canonical shape as the TypeScript EvidenceEvent contract.

- Events are OBSERVED proposals only (human review required for VERIFIED).
- Each append is hash-chained to the previous event for the same mission.
- Sensitive inputs (passwords, Aadhaar, PAN, EPIC, tokens) are redacted.
- Fail closed: if the ledger cannot be written, the scan is rejected.
"""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

try:  # Optional cross-ledger anchor to the authoritative TS Postgres store.
    import urllib.request as _urlrequest
    import urllib.error as _urlerror
except Exception:  # pragma: no cover - urllib is stdlib
    _urlrequest = None  # type: ignore
    _urlerror = None  # type: ignore

SENSITIVE_KEYS: set[str] = {
    "password", "passwd", "secret", "token", "api_key", "apikey",
    "aadhaar", "pan", "epic",
}

LEDGER_PATH = Path(
    os.environ.get("DISHA_EVIDENCE_LEGACY_DB", os.path.join(os.path.dirname(__file__), "data", "evidence_ledger.sqlite"))
)

# Optional: anchor every persisted event into the authoritative TypeScript/Postgres
# evidence ledger so one mission = one evidence chain. Only active when configured.
TS_LEDGER_URL = os.environ.get("DISHA_TS_LEDGER_URL", "").strip()
TS_LEDGER_API_KEY = os.environ.get("DISHA_TS_LEDGER_API_KEY", "").strip()


def _anchor_to_ts(event: dict[str, Any]) -> None:
    """Best-effort anchor of one event into the TS ledger. Never blocks persistence."""
    if not TS_LEDGER_URL or _urlrequest is None:
        return
    try:
        payload = json.dumps(event, default=str).encode("utf-8")
        req = _urlrequest.Request(
            TS_LEDGER_URL.rstrip("/") + "/append",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "X-Request-ID": event["id"],
                **({"Authorization": f"Bearer {TS_LEDGER_API_KEY}"} if TS_LEDGER_API_KEY else {}),
            },
            method="POST",
        )
        with _urlrequest.urlopen(req, timeout=5) as resp:  # noqa: S310
            _ = resp.read()
    except Exception:
        # Anchor failure must NOT reject a locally persisted observation.
        pass


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def _connect() -> sqlite3.Connection:
    _ensure_parent(LEDGER_PATH)
    conn = sqlite3.connect(str(LEDGER_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS evidence_events (
            id TEXT PRIMARY KEY,
            previous_hash TEXT NOT NULL,
            hash TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            actor_type TEXT NOT NULL,
            actor_id TEXT NOT NULL,
            actor_display_name TEXT,
            event_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            sources TEXT NOT NULL,
            verification TEXT NOT NULL,
            policy_id TEXT NOT NULL,
            policy_decision TEXT NOT NULL,
            policy_reasons TEXT NOT NULL,
            mission_id TEXT,
            case_id TEXT,
            signature TEXT,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_evidence_mission ON evidence_events(mission_id, created_at)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_evidence_hash_chain ON evidence_events(previous_hash, hash)"
    )
    conn.commit()
    return conn


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


def _redact(inputs: dict[str, Any]) -> dict[str, Any]:
    return {
        k: ("[REDACTED]" if k.lower() in SENSITIVE_KEYS else v)
        for k, v in inputs.items()
    }


def _latest_hash(conn: sqlite3.Connection, mission_id: str | None) -> str:
    if mission_id:
        row = conn.execute(
            "SELECT hash FROM evidence_events WHERE mission_id = ? ORDER BY created_at DESC, id DESC LIMIT 1",
            (mission_id,),
        ).fetchone()
    else:
        row = conn.execute(
            "SELECT hash FROM evidence_events ORDER BY created_at DESC, id DESC LIMIT 1"
        ).fetchone()
    return row[0] if row and row[0] else "0"


def append_evidence_events(
    *,
    results: dict[str, Any],
    inputs: dict[str, Any],
    mission_id: str | None = None,
    actor_id: str = "osint-backend",
) -> list[dict[str, Any]]:
    """Convert collector results into EvidenceEvent-shaped dicts and persist them.

    Every event is appended to the real hash-chained SQLite ledger. If the ledger
    write fails the operation is rejected (fail closed). Returns the persisted
    events so callers can surface them in the API response.
    """
    events: list[dict[str, Any]] = []
    ts = datetime.now(UTC).isoformat()
    safe_inputs = _redact(inputs)

    conn = _connect()
    try:
        conn.execute("BEGIN IMMEDIATE")
        prev = _latest_hash(conn, mission_id)
        for name, value in results.items():
            if value is None:
                continue
            if isinstance(value, str) and value.startswith("ERR "):
                continue
            if isinstance(value, dict) and value.get("status") == "denied_by_policy":
                continue
            eid = _ulid_like()
            payload = {"collector": name, "inputs": safe_inputs, "result": value}
            h = _hash_event(eid, prev, ts, payload)
            event = {
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
                    "reasons": ["Persisted to Python OSINT evidence ledger; human review required for VERIFIED"],
                },
                "missionId": mission_id,
                "ledgerNote": "persisted",
            }
            conn.execute(
                """
                INSERT INTO evidence_events (
                    id, previous_hash, hash, timestamp,
                    actor_type, actor_id, actor_display_name,
                    event_type, payload, sources, verification,
                    policy_id, policy_decision, policy_reasons,
                    mission_id, case_id, signature
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    eid, prev, h, ts,
                    "adapter", actor_id, name,
                    "observation", json.dumps(payload, default=str),
                    json.dumps(event["sources"], default=str), "OBSERVED",
                    "osint-public-or-authorized", "allow",
                    json.dumps(["Persisted to Python OSINT evidence ledger; human review required for VERIFIED"]),
                    mission_id, None, None,
                ),
            )
            events.append(event)
            prev = h
            _anchor_to_ts(event)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return events


def _row_to_event(r: tuple) -> dict[str, Any]:
    (eid, prev, h, ts, actor_type, actor_id, actor_display,
     event_type, payload, sources, verification,
     policy_id, policy_decision, policy_reasons,
     mission_id, case_id, signature, _created) = r
    return {
        "id": eid,
        "previousHash": prev,
        "hash": h,
        "timestamp": ts,
        "actor": {"type": actor_type, "id": actor_id, "displayName": actor_display or None},
        "type": event_type,
        "payload": json.loads(payload) if payload else {},
        "sources": json.loads(sources) if sources else [],
        "verification": verification,
        "policyContext": {
            "policyId": policy_id,
            "decision": policy_decision,
            "reasons": json.loads(policy_reasons) if policy_reasons else [],
        },
        "missionId": mission_id or None,
        "caseId": case_id or None,
        "signature": signature or None,
    }


def verify_chain(mission_id: str | None = None) -> dict[str, Any]:
    """Verify the full hash chain integrity (linkage + content hash) for all events (or one mission)."""
    conn = _connect()
    try:
        if mission_id:
            rows = conn.execute(
                "SELECT id, previous_hash, hash, timestamp, actor_type, actor_id, actor_display_name, "
                "event_type, payload, sources, verification, policy_id, policy_decision, policy_reasons, "
                "mission_id, case_id, signature, created_at FROM evidence_events WHERE mission_id = ? "
                "ORDER BY created_at ASC, id ASC",
                (mission_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, previous_hash, hash, timestamp, actor_type, actor_id, actor_display_name, "
                "event_type, payload, sources, verification, policy_id, policy_decision, policy_reasons, "
                "mission_id, case_id, signature, created_at FROM evidence_events ORDER BY created_at ASC, id ASC"
            ).fetchall()
    finally:
        conn.close()

    expected_prev = "0"
    for r in rows:
        event = _row_to_event(r)
        if event["previousHash"] != expected_prev:
            return {"valid": False, "brokenAt": event["id"], "reason": "previousHash mismatch"}
        # Recompute content hash over the event minus its stored hash.
        event_without_hash = {k: v for k, v in event.items() if k != "hash"}
        expected_hash = _hash_event(event["id"], event["previousHash"], event["timestamp"], event["payload"])
        if expected_hash != event["hash"]:
            return {"valid": False, "brokenAt": event["id"], "reason": "content hash mismatch"}
        expected_prev = event["hash"]
    return {"valid": True, "count": len(rows)}


def get_events_for_mission(mission_id: str) -> list[dict[str, Any]]:
    """Return all persisted evidence events for a mission, oldest first."""
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT id, previous_hash, hash, timestamp, actor_type, actor_id, actor_display_name, "
            "event_type, payload, sources, verification, policy_id, policy_decision, policy_reasons, "
            "mission_id, case_id, signature, created_at FROM evidence_events WHERE mission_id = ? "
            "ORDER BY created_at ASC, id ASC",
            (mission_id,),
        ).fetchall()
    finally:
        conn.close()
    return [_row_to_event(r) for r in rows]


def export_chain(mission_id: str) -> dict[str, Any]:
    """Export a complete, verifiable evidence package for a mission (reconstructibility)."""
    events = get_events_for_mission(mission_id)
    chain = verify_chain(mission_id)
    return {
        "missionId": mission_id,
        "eventCount": len(events),
        "chainValid": chain["valid"],
        "brokenAt": chain.get("brokenAt"),
        "events": events,
        "exportedAt": datetime.now(UTC).isoformat(),
    }
