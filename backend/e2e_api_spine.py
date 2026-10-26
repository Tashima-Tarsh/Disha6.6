#!/usr/bin/env python3
"""E2E API spine (no live network required for core asserts).

Uses FastAPI TestClient against app.py:
  - fail-closed auth
  - allowActive policy gate
  - inputsDisplay vs inputsRedacted
  - local India validators run
  - evidenceEvents proposal batch

Run:  DISHA_OSINT_API_KEY=ci-test-key python e2e_api_spine.py
"""
from __future__ import annotations

import os
import sys

# Fail closed if key missing — set before importing app
os.environ.setdefault("DISHA_OSINT_API_KEY", "ci-test-key")
KEY = os.environ["DISHA_OSINT_API_KEY"]

from app import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


def main() -> int:
    errors: list[str] = []
    client = TestClient(app)

    # 1) Auth required
    r = client.post("/scan", json={"pan": "ABCDE1234F"})
    if r.status_code not in (401, 403):
        errors.append(f"scan without auth expected 401/403 got {r.status_code}")

    headers = {"Authorization": f"Bearer {KEY}"}

    # 2) Local PAN validator (no network)
    r = client.post("/scan", headers=headers, json={"pan": "ABCDE1234F", "missionId": "e2e-ci"})
    if r.status_code != 200:
        errors.append(f"scan pan failed: {r.status_code} {r.text[:200]}")
    else:
        body = r.json()
        if "India: PAN validator" not in body.get("results", {}):
            errors.append(f"PAN collector missing: {list(body.get('results', {}))}")
        disp = body.get("inputsDisplay") or {}
        red = body.get("inputsRedacted") or body.get("inputs") or {}
        if disp.get("pan") != "ABCDE1234F":
            errors.append(f"inputsDisplay should show PAN: {disp}")
        if red.get("pan") != "[REDACTED]":
            errors.append(f"inputsRedacted should hide PAN: {red}")
        if body.get("evidenceCount", 0) < 1:
            errors.append("expected evidenceEvents for successful observation")

    # 3) Active probe denied by default
    r = client.post("/scan", headers=headers, json={"ip": "127.0.0.1", "allowActive": False})
    if r.status_code != 200:
        errors.append(f"scan ip failed: {r.status_code}")
    else:
        body = r.json()
        if "Port scan (common)" in body.get("results", {}):
            errors.append("port scan ran without allowActive")
        denied = body.get("deniedByPolicy") or []
        if not any(d.get("name") == "Port scan (common)" for d in denied):
            errors.append(f"port scan not listed in deniedByPolicy: {denied}")

    # 4) Tools status actionable
    r = client.get("/tools")
    if r.status_code != 200:
        errors.append(f"/tools failed {r.status_code}")
    else:
        data = r.json()
        cols = data.get("collectors") or []
        if len(cols) < 30:
            errors.append(f"expected ~36 collectors, got {len(cols)}")
        if not all("status" in c and "actionable" in c for c in cols):
            errors.append("collectors missing status/actionable fields")

    # 5) Health / root
    r = client.get("/")
    if r.status_code != 200 or not r.json().get("constitutional"):
        errors.append("root health not constitutional")

    if errors:
        print("E2E API SPINE FAILED")
        for e in errors:
            print(" -", e)
        return 1

    print("E2E API SPINE OK")
    print("  auth=ok policy=ok display_pii=ok tools=ok evidence_proposals=ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
