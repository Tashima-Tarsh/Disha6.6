"""Generic ingestion helpers.

fetch, sha256, read_json, write_json, and a per-host rate limiter. No PII
columns, no identifier tables — just byte-preserving retrieval and hashing.
"""

import hashlib
import json
import os
import time
from pathlib import Path
from typing import Optional

import requests


def fetch(
    url: str,
    dest: str | os.PathLike[str],
    *,
    retries: int = 5,
    backoff: float = 2.0,
    chunk: int = 8 << 20,
    resume: bool = True,
    headers: Optional[dict] = None,
) -> str:
    """Download url to dest, byte-preserving.

    Returns the destination path. Supports resume via Range requests and
    exponential backoff on transient failures.
    """
    dest_path = Path(dest)
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    req_headers = dict(headers or {})
    start_byte = 0
    if resume and dest_path.exists():
        start_byte = dest_path.stat().st_size
        req_headers["Range"] = f"bytes={start_byte}-"

    mode = "ab" if (resume and start_byte > 0) else "wb"

    last_error: Optional[Exception] = None
    for attempt in range(retries):
        try:
            response = requests.get(
                url, headers=req_headers, stream=True, timeout=30
            )
            response.raise_for_status()

            if start_byte > 0 and response.status_code == 200:
                # Server ignored Range; restart from scratch.
                start_byte = 0
                mode = "wb"
                req_headers = dict(headers or {})
                response = requests.get(
                    url, headers=req_headers, stream=True, timeout=30
                )
                response.raise_for_status()

            with open(dest_path, mode) as handle:
                for block in response.iter_content(chunk_size=chunk):
                    if block:
                        handle.write(block)
            return str(dest_path)
        except Exception as exc:  # noqa: BLE001 - transient, retry
            last_error = exc
            if attempt < retries - 1:
                time.sleep(backoff ** attempt)

    assert last_error is not None
    raise last_error


def sha256(path: str | os.PathLike[str]) -> str:
    """Return the hex SHA-256 digest of a file."""
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def read_json(path: str | os.PathLike[str]) -> dict:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: str | os.PathLike[str], obj: dict) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(obj, handle, indent=2, sort_keys=True)


class _TokenBucket:
    def __init__(self, rate: float, burst: int) -> None:
        self.rate = rate
        self.burst = burst
        self.tokens = float(burst)
        self.last = time.monotonic()

    def acquire(self) -> None:
        now = time.monotonic()
        self.tokens = min(self.burst, self.tokens + (now - self.last) * self.rate)
        self.last = now
        if self.tokens < 1.0:
            sleep_for = (1.0 - self.tokens) / self.rate
            time.sleep(sleep_for)
            self.tokens = 0.0
            self.last = time.monotonic()
        else:
            self.tokens -= 1.0


_buckets: dict[str, _TokenBucket] = {}


def rate_limit(host: str, rate: float = 1.0, burst: int = 3) -> None:
    """Throttle calls to *host* to *rate* requests/second with *burst* headroom."""
    bucket = _buckets.get(host)
    if bucket is None or bucket.rate != rate or bucket.burst != burst:
        bucket = _TokenBucket(rate, burst)
        _buckets[host] = bucket
    bucket.acquire()
