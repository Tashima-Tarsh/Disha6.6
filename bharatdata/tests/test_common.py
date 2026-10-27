"""Tests for ingest.common helpers."""

from __future__ import annotations

import hashlib
import os
import tempfile
import time

import pytest

from ingest.common import rate_limit, read_json, sha256, write_json


def test_sha256_stability():
    with tempfile.NamedTemporaryFile("wb", delete=False) as f:
        f.write(b"bharatdata content\n")
        path = f.name
    try:
        h1 = sha256(path)
        h2 = sha256(path)
        assert h1 == h2
        assert len(h1) == 64
        assert hashlib.sha256(b"bharatdata content\n").hexdigest() == h1
    finally:
        os.remove(path)


def test_sha256_content_change():
    with tempfile.NamedTemporaryFile("wb", delete=False) as f:
        f.write(b"data version 1")
        path = f.name
    try:
        h1 = sha256(path)
        with open(path, "wb") as f2:
            f2.write(b"data version 2")
        h2 = sha256(path)
        assert h1 != h2
    finally:
        os.remove(path)


def test_json_read_write_roundtrip():
    with tempfile.TemporaryDirectory() as tmpdir:
        target = os.path.join(tmpdir, "test.json")
        data = {"state": "Delhi", "code": "DL", "active": True, "metrics": [10, 20, 30]}
        write_json(target, data)
        loaded = read_json(target)
        assert loaded == data


def test_rate_limiter_pacing():
    host = "rate-test.example.com"
    t0 = time.monotonic()
    # Consume burst
    for _ in range(3):
        rate_limit(host, rate=5.0, burst=3)
    # Next call should be paced
    rate_limit(host, rate=5.0, burst=3)
    elapsed = time.monotonic() - t0
    assert elapsed >= 0.1

