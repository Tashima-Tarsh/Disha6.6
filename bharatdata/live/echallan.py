"""eChallan Live Traffic Violation Status Adapter."""

from __future__ import annotations

import re
import time
import requests

ECHALLAN_BASE = "https://echallan.parivahan.gov.in"


def check_health(timeout: float = 5.0) -> dict:
    """Probe eChallan portal availability."""
    start = time.time()
    try:
        res = requests.head(
            ECHALLAN_BASE,
            headers={"User-Agent": "BharatData-LiveProbe/1.0"},
            timeout=timeout,
            allow_redirects=True,
        )
        latency_ms = int((time.time() - start) * 1000)
        return {
            "status": "HEALTHY" if res.status_code < 400 else "DEGRADED",
            "http_status": res.status_code,
            "latency_ms": latency_ms,
            "endpoint": ECHALLAN_BASE,
        }
    except Exception as exc:
        latency_ms = int((time.time() - start) * 1000)
        return {
            "status": "UNREACHABLE",
            "error": str(exc),
            "latency_ms": latency_ms,
            "endpoint": ECHALLAN_BASE,
        }


def validate_challan_number(challan_number: str) -> bool:
    """Check standard Parivahan challan syntax (e.g. DL1234562401011234)."""
    clean = re.sub(r"[^A-Za-z0-9]", "", challan_number).upper()
    return bool(re.match(r"^[A-Z]{2}[0-9A-Z]{12,20}$", clean))


def lookup_challan_status(challan_number: str) -> dict:
    """Validate challan number syntax."""
    clean = re.sub(r"[^A-Za-z0-9]", "", challan_number).upper()
    if not validate_challan_number(clean):
        return {
            "challan_number": challan_number,
            "valid_format": False,
            "status": "INVALID_FORMAT",
        }

    return {
        "challan_number": clean,
        "valid_format": True,
        "state_code": clean[:2],
        "status": "FORMAT_VERIFIED",
    }

