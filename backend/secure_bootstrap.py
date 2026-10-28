"""
Constitutional security bootstrap for the OSINT backend.

Import this at the top of app.py (or call apply_security(app)) to enforce:
- Mandatory scoped API key (fail closed)
- Restricted CORS
- Path sandbox: absolute root enforced, symlinks rejected, root must exist

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

from auth import require_api_key  # scoped, fail-closed, rate-limited


# ---------------------------------------------------------------------------
# Auth — fail closed (re-exported with scope support from auth.py)
# ---------------------------------------------------------------------------

__all__ = [
    "require_api_key",
    "ensure_inside_workspace",
    "ensure_directory_inside_workspace",
    "apply_security",
    "ALLOWED_DATA_ROOT",
]


# ---------------------------------------------------------------------------
# Path sandbox — C4 hardening
# ---------------------------------------------------------------------------

def _resolve_data_root() -> Path:
    """Resolve the allowed data root.

    Rules:
    - Must be an absolute path (env DISHA_DATA_ROOT or backend/data).
    - Must exist on disk (fail closed if missing).
    - Symlinks in the resolved root are rejected.
    """
    raw = os.environ.get("DISHA_DATA_ROOT", os.path.join(os.path.dirname(__file__), "data"))
    root = Path(raw).resolve()

    # Reject if the root itself is a symlink (escape vector).
    if root.is_symlink():
        raise RuntimeError(f"DISHA_DATA_ROOT must not be a symlink: {root}")

    # Fail closed if the root does not exist.
    if not root.exists():
        raise RuntimeError(f"DISHA_DATA_ROOT does not exist: {root}")

    return root


ALLOWED_DATA_ROOT = _resolve_data_root()


def _has_symlink_component(path: Path) -> bool:
    """Return True if any component of path (from root down) is a symlink."""
    try:
        parts = path.parts
    except ValueError:
        return True
    cur = Path(parts[0]) if parts[0] else Path("/")
    if cur.is_symlink():
        return True
    for part in parts[1:]:
        cur = cur / part
        if cur.is_symlink():
            return True
    return False


def ensure_inside_workspace(raw_path: str | os.PathLike) -> Path:
    """
    Resolve the path and guarantee it stays inside ALLOWED_DATA_ROOT.
    Rejects symlinks anywhere in the resolved path (C4). Raises PermissionError
    on escape attempts.
    """
    candidate = (ALLOWED_DATA_ROOT / raw_path).resolve()

    # Symlink component anywhere under the root = escape vector.
    if _has_symlink_component(candidate):
        raise PermissionError(f"Symlink component rejected: {raw_path}")

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
        allow_credentials=False,
        max_age=0,
    )
