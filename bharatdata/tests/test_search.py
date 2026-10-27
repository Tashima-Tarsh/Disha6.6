"""Tests for BharatData Search CLI and FastAPI server."""

from __future__ import annotations

import glob
import os
import sqlite3
import tempfile
from unittest.mock import MagicMock

from fastapi.testclient import TestClient
import pytest

from search import cli, server
from search.server import app


@pytest.fixture
def test_db(monkeypatch):
    """Setup a populated temporary SQLite database for testing."""
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmpdir:
        db_path = os.path.join(tmpdir, "bharat.db")
        monkeypatch.setattr(cli, "DB", db_path)
        monkeypatch.setattr(server, "DB", db_path)

        con = sqlite3.connect(db_path)
        schema_files = sorted(glob.glob("schema/*.sql"))
        if not schema_files:
            schema_files = sorted(glob.glob("bharatdata/schema/*.sql"))

        for sf in schema_files:
            with open(sf, "r", encoding="utf-8") as f:
                con.executescript(f.read())

        cur = con.cursor()
        cur.execute(
            """
            INSERT INTO aadhaar (uid, name, dob, gender, pincode, _source)
            VALUES ('111122223333', 'Ramesh Kumar', '1985', 'M', '110001', 'sample.xml')
            """
        )
        cur.execute(
            """
            INSERT INTO eci (elector_name, epic_number, age, district, state, _source)
            VALUES ('Ramesh Kumar', 'ABC1234567', '1985', 'Central Delhi', 'Delhi', 'eci.csv')
            """
        )
        cur.execute(
            """
            INSERT INTO vahan (reg_no, owner_name, fuel, rto, _source)
            VALUES ('DL01AB1234', 'Ramesh Kumar', 'PETROL', 'DL-01', 'vahan.csv')
            """
        )
        cur.execute(
            """
            INSERT INTO cowin (beneficiary_id, name, pincode, vaccine, _source)
            VALUES ('COW-101', 'Ramesh Kumar', '110001', 'COVISHIELD', 'cowin.csv')
            """
        )
        con.commit()
        con.close()

        yield db_path


def test_cli_query_and_any(test_db, capsys):
    args = MagicMock()
    args.key = "ABC1234567"
    cli.cmd_any(args)
    captured = capsys.readouterr()
    assert "ABC1234567" in captured.out
    assert "Ramesh Kumar" in captured.out


def test_cli_join(test_db, capsys):
    args = MagicMock()
    args.aadhaar = "111122223333"
    cli.cmd_join(args)
    captured = capsys.readouterr()
    assert "111122223333" in captured.out
    assert "ABC1234567" in captured.out


def test_fastapi_any(test_db):
    client = TestClient(app)
    res = client.get("/any?key=111122223333")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert data[0]["name"] == "Ramesh Kumar"


def test_fastapi_manifest(test_db):
    client = TestClient(app)
    res = client.get("/manifest?path=nonexistent.txt")
    assert res.status_code == 200
    assert res.json() == []

