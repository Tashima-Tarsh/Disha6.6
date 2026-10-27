"""Tests for ingest.common."""

import hashlib
import json
import os
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from ingest.common import fetch, rate_limit, read_json, sha256, write_json


def _tmp() -> str:
    return tempfile.mkdtemp()


def test_sha256_stability():
    path = os.path.join(_tmp(), "a.txt")
    with open(path, "wb") as handle:
        handle.write(b"hello world\n")
    first = sha256(path)
    second = sha256(path)
    assert first == second
    assert len(first) == 64
    assert hashlib.sha256(b"hello world\n").hexdigest() == first


def test_sha256_changes_with_content():
    path = os.path.join(_tmp(), "b.txt")
    with open(path, "wb") as handle:
        handle.write(b"one")
    h1 = sha256(path)
    with open(path, "wb") as handle:
        handle.write(b"two")
    h2 = sha256(path)
    assert h1 != h2


def test_read_write_json_roundtrip():
    path = os.path.join(_tmp(), "obj.json")
    obj = {"a": 1, "b": [1, 2, 3], "c": {"nested": True}}
    write_json(path, obj)
    assert read_json(path) == obj


def test_rate_limit_spacing():
    host = "example.test"
    start = time.monotonic()
    for _ in range(6):
        rate_limit(host, rate=1.0, burst=1)
    elapsed = time.monotonic() - start
    # 6 acquisitions at 1 req/s with burst 1 -> at least ~5 seconds of spacing
    assert elapsed >= 4.5, f"rate limiter not spacing: {elapsed:.2f}s"


def test_rate_limit_independent_hosts():
    # Different hosts should not throttle each other.
    rate_limit("host-a.test", rate=1.0, burst=1)
    start = time.monotonic()
    rate_limit("host-b.test", rate=1.0, burst=1)
    assert time.monotonic() - start < 0.1


def _serve(path: str, content: bytes, port: int) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def test_fetch_full_download():
    content = b"X" * (500 * 1024)
    server = _serve("/file.bin", content, 18091)
    try:
        dest = os.path.join(_tmp(), "downloaded.bin")
        result = fetch(f"http://127.0.0.1:18091/file.bin", dest)
        assert result == dest
        with open(dest, "rb") as handle:
            assert handle.read() == content
        assert sha256(dest) == hashlib.sha256(content).hexdigest()
    finally:
        server.shutdown()


def test_fetch_resume_after_partial_write():
    content = b"Y" * (300 * 1024)
    half = len(content) // 2

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            rng = self.headers.get("Range")
            if rng and rng.startswith("bytes="):
                spec = rng.split("=", 1)[1]
                start_str, _ = spec.split("-", 1)
                start = int(start_str)
                slice_bytes = content[start:]
                self.send_response(206)
                self.send_header("Content-Range", f"bytes {start}-{len(content)-1}/{len(content)}")
                self.send_header("Content-Length", str(len(slice_bytes)))
                self.end_headers()
                self.wfile.write(slice_bytes)
            else:
                self.send_response(200)
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 18092), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        dest = os.path.join(_tmp(), "partial.bin")
        with open(dest, "wb") as handle:
            handle.write(content[:half])
        result = fetch(f"http://127.0.0.1:18092/resume.bin", dest, resume=True)
        assert result == dest
        with open(dest, "rb") as handle:
            assert handle.read() == content
        assert sha256(dest) == hashlib.sha256(content).hexdigest()
    finally:
        server.shutdown()


def test_fetch_retries_on_transient_failure():
    attempts = {"n": 0}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            attempts["n"] += 1
            if attempts["n"] < 3:
                self.send_response(500)
                self.end_headers()
                return
            body = b"recovered"
            self.send_response(200)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 18093), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        dest = os.path.join(_tmp(), "retry.bin")
        result = fetch(f"http://127.0.0.1:18093/retry.bin", dest, retries=5, backoff=0.05)
        assert result == dest
        with open(dest, "rb") as handle:
            assert handle.read() == b"recovered"
        assert attempts["n"] == 3
    finally:
        server.shutdown()
