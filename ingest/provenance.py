"""Provenance ledger.

Appends one JSON object per ingested file to index/manifest.json and exposes
skip_if_unchanged(sha256) so fetchers can avoid re-downloading identical bytes.
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Optional

MANIFEST_PATH = "index/manifest.json"

REQUIRED_KEYS = (
    "path",
    "url",
    "fetched_utc",
    "http_status",
    "bytes",
    "sha256",
    "run_id",
    "phase",
    "parser",
)


def _ensure_index_dir() -> None:
    os.makedirs(os.path.dirname(MANIFEST_PATH), exist_ok=True)


def load_manifest() -> list[dict]:
    _ensure_index_dir()
    if not os.path.exists(MANIFEST_PATH):
        return []
    with open(MANIFEST_PATH, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError(f"{MANIFEST_PATH} must contain a JSON array")
    return data


def save_manifest(entries: list[dict]) -> None:
    _ensure_index_dir()
    tmp = MANIFEST_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(entries, handle, indent=2, sort_keys=True)
    os.replace(tmp, MANIFEST_PATH)


def record(
    path: str,
    url: str,
    http_status: int,
    size_bytes: int,
    sha256: str,
    run_id: str,
    phase: str,
    parser: str,
) -> dict:
    """Append one entry to the manifest and return it."""
    import datetime

    entries = load_manifest()
    entry = {
        "path": path,
        "url": url,
        "fetched_utc": datetime.datetime.utcnow().isoformat() + "Z",
        "http_status": http_status,
        "bytes": size_bytes,
        "sha256": sha256,
        "run_id": run_id,
        "phase": phase,
        "parser": parser,
    }
    entries.append(entry)
    save_manifest(entries)
    return entry


def skip_if_unchanged(sha256: str, path: Optional[str] = None) -> bool:
    """Return True if *sha256* already exists.

    When *path* is given, only entries for that path are considered. Otherwise
    the hash is checked against every entry in the manifest.
    """
    entries = load_manifest()
    for entry in entries:
        if entry.get("sha256") != sha256:
            continue
        if path is not None and entry.get("path") != path:
            continue
        return True
    return False


def validate() -> list[str]:
    """Validate the manifest. Returns a list of problem strings (empty = ok)."""
    problems: list[str] = []
    entries = load_manifest()
    for index, entry in enumerate(entries):
        label = f"[{index}]"
        if not isinstance(entry, dict):
            problems.append(f"{label}: not an object")
            continue
        for key in REQUIRED_KEYS:
            if key not in entry:
                problems.append(f"{label}: missing key {key!r}")
        path = entry.get("path")
        if path and not os.path.exists(path):
            problems.append(f"{label}: path missing on disk: {path}")
        if path and entry.get("sha256"):
            from ingest.common import sha256 as compute_sha256

            if os.path.exists(path):
                actual = compute_sha256(path)
                if actual != entry["sha256"]:
                    problems.append(
                        f"{label}: sha256 mismatch for {path} "
                        f"(manifest {entry['sha256']} != actual {actual})"
                    )
    return problems


def main() -> None:
    parser = argparse.ArgumentParser(description="Provenance ledger tool")
    parser.add_argument("--validate", action="store_true", help="validate manifest")
    args = parser.parse_args()

    if args.validate:
        problems = validate()
        if problems:
            for problem in problems:
                print(problem)
            raise SystemExit(1)
        print("manifest valid")
        return

    parser.print_help()
    raise SystemExit(0)


if __name__ == "__main__":
    main()
