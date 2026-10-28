"""
Constitutional authentication for the OSINT backend.
Fail closed. No optional open mode.

Auth model:
- Scoped API keys via env vars (scan | graph | high_risk). If a scoped key is
  unset, the service refuses to operate that scope (fail closed).
- `DISHA_OSINT_API_KEY` remains a backward-compatible default key used when no
  scope-specific key is configured.
- Per-actor (client host + scope) rate limiting to blunt brute-force / key
  guessing. No JWT in this layer; tokens are long-lived scoped keys rotated out
  of band. Short-lived JWTs can be layered on top without changing this gate.
"""
from __future__ import annotations

import os
import time
from collections import defaultdict
from threading import Lock

from fastapi import Header, HTTPException, status

# Scope -> env var. A request for a scope whose key is missing fails closed.
SCOPE_KEYS: dict[str, str] = {
    "scan": "DISHA_SCAN_API_KEY",
    "graph": "DISHA_GRAPH_API_KEY",
    "high_risk": "DISHA_HIGH_RISK_API_KEY",
}

# Backward-compatible default key used for any scope that lacks its own key.
DEFAULT_KEY = (
    os.environ.get("DISHA_OSINT_API_KEY")
    or os.environ.get("OSINT_API_KEY")
    or ""
)


def _resolve_key(scope: str) -> str | None:
    env_var = SCOPE_KEYS.get(scope)
    if env_var:
        key = os.environ.get(env_var)
        if key:
            return key
    return DEFAULT_KEY or None


# Per-actor rate limiting (scope, client_host) -> sliding window state.
_RATE_STATE: dict[tuple[str, str], list[float]] = defaultdict(list)
_RATE_LOCK = Lock()
RATE_LIMIT_REQUESTS = int(os.environ.get("DISHA_AUTH_RATE_LIMIT", "60"))
RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("DISHA_AUTH_RATE_WINDOW", "60"))


def _check_rate(actor: str) -> None:
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW_SECONDS
    with _RATE_LOCK:
        stamps = [t for t in _RATE_STATE[actor] if t > window_start]
        if len(stamps) >= RATE_LIMIT_REQUESTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Auth rate limit exceeded",
            )
        stamps.append(now)
        _RATE_STATE[actor] = stamps


def require_api_key(
    authorization: str | None = Header(default=None),
    scope: str = "scan",
) -> None:
    """
    Mandatory Bearer token check for a scope.
    Raises 401 if key is missing or incorrect; 503 if the scope is unconfigured.
    Per-actor rate limiting is applied before the key comparison.
    """
    key = _resolve_key(scope)
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"OSINT service is not configured for scope '{scope}'. Refusing to operate open.",
        )

    actor = f"{scope}:{authorization or 'unknown'}"
    _check_rate(actor)

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    import hmac

    if not hmac.compare_digest(token, key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
