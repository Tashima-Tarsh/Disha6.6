"""
Constitutional authentication for the OSINT backend.
Fail closed. No optional open mode.
"""
from __future__ import annotations

import os

from fastapi import Header, HTTPException, status

# Required. If unset, the service refuses to start sensitive endpoints.
OSINT_API_KEY = os.environ.get("DISHA_OSINT_API_KEY") or os.environ.get("OSINT_API_KEY")


def require_api_key(authorization: str | None = Header(default=None)) -> None:
    """
    Mandatory Bearer token check.
    Raises 401 if key is missing or incorrect.
    """
    if not OSINT_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OSINT service is not configured with DISHA_OSINT_API_KEY. Refusing to operate open.",
        )

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

    if token != OSINT_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
