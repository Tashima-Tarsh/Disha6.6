#!/usr/bin/env python3
"""Offline smoke for the constitutional OSINT spine (no network required).

Run:  python spine_smoke.py
"""
from __future__ import annotations

import sys

from osint_collectors import (
    plan,
    redact_for_log,
    inputs_for_display,
    list_tools_status,
    REGISTRY,
)
from evidence_bridge import observations_to_evidence_events
from vyuha_formations import VYUH_FORMATIONS, COLLECTOR_NAME_MAP


def main() -> int:
    errors: list[str] = []

    passive = plan({"ip": "8.8.8.8"}, allow_active=False)
    active = plan({"ip": "8.8.8.8"}, allow_active=True)
    passive_names = {c["name"] for c in passive}
    active_names = {c["name"] for c in active}
    if "Port scan (common)" in passive_names:
        errors.append("Port scan ran without allow_active")
    if "Port scan (common)" not in active_names:
        errors.append("Port scan missing when allow_active=True")

    sample = {
        "email": "a@b.c",
        "password": "secret",
        "aadhaar": "123412341234",
        "pan": "ABCDE1234F",
        "phone": "9876543210",
    }
    red = redact_for_log(sample)
    disp = inputs_for_display(sample)
    if red.get("password") != "[REDACTED]" or red.get("aadhaar") != "[REDACTED]":
        errors.append(f"redact_for_log failed: {red}")
    if disp.get("password") != "[REDACTED]":
        errors.append("password must stay redacted on display")
    if disp.get("aadhaar") != "123412341234" or disp.get("email") != "a@b.c":
        errors.append(f"inputs_for_display should keep PII: {disp}")

    events = observations_to_evidence_events(
        results={"demo": {"ok": True}},
        inputs={"password": "x", "email": "t@example.com"},
        mission_id="smoke",
    )
    if not events:
        errors.append("evidence bridge produced no events")
    elif events[0]["payload"]["inputs"].get("password") != "[REDACTED]":
        errors.append("bridge did not redact password")

    status = list_tools_status()
    if len(status) != len(REGISTRY):
        errors.append("tools status length mismatch")
    for t in status:
        if "executable" not in t or "actionable" not in t or "status" not in t:
            errors.append(f"incomplete status for {t.get('name')}")
            break

    if len(VYUH_FORMATIONS) < 8:
        errors.append("expected 8 Vyuha formations")
    for fid, form in VYUH_FORMATIONS.items():
        for c in form.get("collectors", []):
            if c == "graph":
                continue
            if c not in COLLECTOR_NAME_MAP:
                errors.append(f"formation {fid} collector {c} unmapped")

    if not any(c.get("risk") == "active_network" for c in REGISTRY):
        errors.append("no active_network collectors tagged")

    if errors:
        print("SPINE SMOKE FAILED")
        for e in errors:
            print(" -", e)
        return 1

    ready = sum(1 for t in status if t.get("status") == "ready")
    print("SPINE SMOKE OK")
    print(f"  collectors={len(REGISTRY)} ready={ready} formations={len(VYUH_FORMATIONS)}")
    print("  policy_gate=ok display_pii=ok log_redact=ok tools_status=ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
