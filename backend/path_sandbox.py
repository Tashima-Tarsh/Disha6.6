"""
Constitutional path containment.
Uses proper relative resolution — never string prefix.
"""
from __future__ import annotations

import os
from pathlib import Path

# Allowed root for any file operation. Override with env if needed.
ALLOWED_DATA_ROOT = Path(
    os.environ.get("DISHA_DATA_ROOT", os.path.join(os.path.dirname(__file__), "data"))
).resolve()


def ensure_inside_workspace(raw_path: str | os.PathLike) -> Path:
    """
    Resolve the path and guarantee it stays inside ALLOWED_DATA_ROOT.
    Raises PermissionError on escape attempts.
    """
    candidate = (ALLOWED_DATA_ROOT / raw_path).resolve()

    try:
        candidate.relative_to(ALLOWED_DATA_ROOT)
    except ValueError:
        raise PermissionError(
            f"Path escapes allowed data root: {raw_path}"
        ) from None

    return candidate


def ensure_directory_inside_workspace(raw_dir: str | os.PathLike) -> Path:
    path = ensure_inside_workspace(raw_dir)
    if not path.is_dir():
        raise NotADirectoryError(f"Not a directory: {raw_dir}")
    return path
