"""Tests for BharatData Provenance Ledger."""

from __future__ import annotations

import os
import tempfile
import pytest

from ingest.common import sha256
from ingest import ledger


def test_ledger_append_and_skip(monkeypatch):
    with tempfile.TemporaryDirectory() as tmpdir:
        test_manifest = os.path.join(tmpdir, "manifest.json")
        monkeypatch.setattr(ledger, "M", test_manifest)

        sample_file = os.path.join(tmpdir, "sample.txt")
        with open(sample_file, "w", encoding="utf-8") as f:
            f.write("content for ledger test")

        file_hash = sha256(sample_file)
        assert ledger.skip_if_unchanged(sample_file, file_hash) is False

        ledger.append(
            path=sample_file,
            url="https://example.com/sample.txt",
            http_status=200,
            sha=file_hash,
            phase="test",
            parser="test_parser",
        )

        assert ledger.skip_if_unchanged(sample_file, file_hash) is True
        entries = ledger.lookup(sample_file)
        assert len(entries) == 1
        assert entries[0]["sha256"] == file_hash
        assert entries[0]["parser"] == "test_parser"


def test_ledger_validate_clean(monkeypatch):
    with tempfile.TemporaryDirectory() as tmpdir:
        test_manifest = os.path.join(tmpdir, "manifest.json")
        monkeypatch.setattr(ledger, "M", test_manifest)

        sample_file = os.path.join(tmpdir, "test.bin")
        with open(sample_file, "wb") as f:
            f.write(b"\x00\x01\x02\x03")

        file_hash = sha256(sample_file)
        ledger.append(
            path=sample_file,
            url="file://test.bin",
            http_status=200,
            sha=file_hash,
            phase="ingest",
            parser="test",
        )

        assert ledger.validate() is True


def test_ledger_validate_detects_malformed_record(monkeypatch):
    with tempfile.TemporaryDirectory() as tmpdir:
        test_manifest = os.path.join(tmpdir, "manifest.json")
        monkeypatch.setattr(ledger, "M", test_manifest)

        # Write invalid record (short hash)
        bad_records = [{"path": "dummy.txt", "url": "url", "fetched_utc": "now",
                        "http_status": 200, "bytes": 0, "sha256": "tooshort",
                        "run_id": "r1", "phase": "p", "parser": "par"}]
        ledger._save(bad_records)

        with pytest.raises(AssertionError):
            ledger.validate()
