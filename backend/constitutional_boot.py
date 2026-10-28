#!/usr/bin/env python3
"""
Constitutional boot validator for the DISHA 6.6 OSINT backend.

Fail-closed. The service refuses to serve sensitive routes unless every
required control is present at startup. Called once at app import.

Checks:
- DISHA_OSINT_API_KEY (or scope-scoped keys) configured — else 503 on sensitive routes
- DISHA_DATA_ROOT exists and is not a symlink — else fail closed
- Evidence ledger directory writable — else fail closed
- Rate-limit config sane
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from secure_bootstrap import ALLOWED_DATA_ROOT, ensure_inside_workspace


class ConstitutionalBootError(RuntimeError):
    """Raised when the service cannot start under the Constitution."""


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise ConstitutionalBootError(
            f"Constitutional boot failed: required env var '{name}' is not set. "
            f"Refusing to operate open."
        )
    return value


def _require_path(name: str, raw: str) -> Path:
    path = Path(raw).resolve()
    if path.is_symlink():
        raise ConstitutionalBootError(
            f"Constitutional boot failed: {name} must not be a symlink: {path}"
        )
    if not path.exists():
        raise ConstitutionalBootError(
            f"Constitutional boot failed: {name} does not exist: {path}"
        )
    return path


def constitutional_boot() -> dict[str, str]:
    """
    Validate every constitutional control before the app serves requests.
    Raises ConstitutionalBootError (fail closed) on any failure.
    Returns a resolved config dict for the app to use.
    """
    config: dict[str, str] = {}

    # Auth — fail closed if no key for any scope.
    # At least one of the scope keys or the default key must be present.
    keys = {
        "scan": os.environ.get("DISHA_SCAN_API_KEY") or "",
        "graph": os.environ.get("DISHA_GRAPH_API_KEY") or "",
        "high_risk": os.environ.get("DISHA_HIGH_RISK_API_KEY") or "",
    }
    default_key = os.environ.get("DISHA_OSINT_API_KEY") or os.environ.get("OSINT_API_KEY") or ""
    if not default_key and not any(keys.values()):
        raise ConstitutionalBootError(
            "Constitutional boot failed: DISHA_OSINT_API_KEY (or a scope-scoped key) "
            "is not set. Refusing to operate open."
        )
    config["default_key_present"] = "1" if default_key else "0"

    # Data root — must exist, absolute, not a symlink.
    root = _require_path("DISHA_DATA_ROOT", os.environ.get(
        "DISHA_DATA_ROOT", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    ))
    config["data_root"] = str(root)

    # Evidence ledger directory must be creatable/writable.
    ledger_dir = Path(os.environ.get(
        "DISHA_EVIDENCE_LEGACY_DB",
        os.path.join(str(root), "evidence_ledger.sqlite")
    )).parent
    try:
        ledger_dir.mkdir(parents=True, exist_ok=True)
        probe = ledger_dir / ".disha_boot_write_probe"
        probe.touch()
        probe.unlink()
    except OSError as exc:
        raise ConstitutionalBootError(
            f"Constitutional boot failed: evidence ledger directory not writable: {ledger_dir} ({exc})"
        ) from None
    config["ledger_dir"] = str(ledger_dir)

    # Rate limit sanity.
    try:
        rl = int(os.environ.get("DISHA_AUTH_RATE_LIMIT", "60"))
        rw = int(os.environ.get("DISHA_AUTH_RATE_WINDOW", "60"))
        if rl <= 0 or rw <= 0:
            raise ValueError
    except ValueError:
        raise ConstitutionalBootError(
            "Constitutional boot failed: DISHA_AUTH_RATE_LIMIT / DISHA_AUTH_RATE_WINDOW must be positive integers."
        )
    config["auth_rate_limit"] = str(rl)
    config["auth_rate_window"] = str(rw)

    # Allowed origins must not be wildcard in production-like mode.
    origins = os.environ.get("DISHA_ALLOWED_ORIGINS", "http://localhost:3000")
    if "*" in origins:
        raise ConstitutionalBootError(
            "Constitutional boot failed: DISHA_ALLOWED_ORIGINS must not contain '*'. Fail closed."
        )
    config["allowed_origins"] = origins

    print(
        "[disha-constitutional-boot] OK "
        f"auth_rate_limit={rl} auth_rate_window={rw} data_root={root} "
        f"ledger_dir={ledger_dir} default_key={'set' if default_key else 'unset(scoped)'} "
        f"origins={origins}"
    )
    return config


# Run automatically when imported so the app is never served unconstitutional.
try:
    BOOT_CONFIG = constitutional_boot()
except ConstitutionalBootError as exc:  # pragma: no cover - fail closed path
    print(f"[disha-constitutional-boot] FAIL CLOSED: {exc}", file=sys.stderr)
    # Re-raise so importing app fails loud in production/test harnesses.
    raise
