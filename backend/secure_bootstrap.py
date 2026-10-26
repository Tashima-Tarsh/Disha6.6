"""
Constitutional security bootstrap for the OSINT backend.

Import this at the top of app.py (or call apply_security(app)) to enforce:
- Mandatory API key (fail closed)
- Restricted CORS
- Path sandbox helpers

Usage in app.py:

    from secure_bootstrap import apply_security, require_api_key, ensure_inside_workspace

    app = FastAPI(...)
    apply_security(app)

    @app.post("/scan", dependencies=[Depends(require_api_key)])
    async def scan(...):
        ...
"""
from __future__ import annotations

import hmac
import os
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Auth — fail closed
# ---------------------------------------------------------------------------

OSINT_API_KEY = os.environ.get("DISHA_OSINT_API_KEY") or os.environ.get("OSINT_API_KEY")


def require_api_key(authorization: str | None = Header(default=None)) -> None:
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
    if scheme.lower() != "bearer" or not hmac.compare_digest(token, OSINT_API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# Path sandbox
# ---------------------------------------------------------------------------

ALLOWED_DATA_ROOT = Path(
    os.environ.get("DISHA_DATA_ROOT", os.path.join(os.path.dirname(__file__), "data"))
).resolve()


def ensure_inside_workspace(raw_path: str | os.PathLike) -> Path:
    candidate = (ALLOWED_DATA_ROOT / raw_path).resolve()
    try:
        candidate.relative_to(ALLOWED_DATA_ROOT)
    except ValueError:
        raise PermissionError(f"Path escapes allowed data root: {raw_path}") from None
    return candidate


def ensure_directory_inside_workspace(raw_dir: str | os.PathLike) -> Path:
    path = ensure_inside_workspace(raw_dir)
    if not path.is_dir():
        raise NotADirectoryError(f"Not a directory: {raw_dir}")
    return path


# ---------------------------------------------------------------------------
# Apply to FastAPI app
# ---------------------------------------------------------------------------

def apply_security(app: FastAPI) -> None:
    """Replace open CORS with explicit origins. Call once after creating the app."""
    # Remove any existing CORS middleware is not trivial; add a strict one.
    # Preferred: do not add the open middleware in app.py at all.
    origins = [
        o.strip()
        for o in os.environ.get("DISHA_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
        if o.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
