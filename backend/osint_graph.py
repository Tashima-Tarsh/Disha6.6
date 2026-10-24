#!/usr/bin/env python3
"""SQLite identity graph helpers for OSINT backend."""
from __future__ import annotations

import csv
import json
import os
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = HERE
DB_PATH = os.environ.get("OSINT_GRAPH_DB", os.path.join(REPO, "data", "osint_graph.sqlite"))


def sg_connect():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def sg_init(conn):
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS identifier (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL,
            value TEXT NOT NULL,
            source TEXT,
            raw TEXT,
            confidence REAL DEFAULT 0.6,
            UNIQUE(kind, value)
        );
        CREATE TABLE IF NOT EXISTS edge (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            a INTEGER NOT NULL,
            b INTEGER NOT NULL,
            relation TEXT,
            source TEXT,
            confidence REAL DEFAULT 0.6
        );
        CREATE INDEX IF NOT EXISTS idx_ident_kind ON identifier(kind);
        CREATE INDEX IF NOT EXISTS idx_ident_value ON identifier(value);
        """
    )
    conn.commit()


def upsert_identifier(cur, kind, value, source, raw=None, conf=0.6):
    cur.execute(
        "INSERT OR IGNORE INTO identifier(kind, value, source, raw, confidence) VALUES (?,?,?,?,?)",
        (kind, value, source, raw, conf),
    )
    cur.execute("SELECT id FROM identifier WHERE kind=? AND value=?", (kind, value))
    row = cur.fetchone()
    return row[0] if row else None


def link(cur, a, b, relation, source, conf=0.6):
    if not a or not b or a == b:
        return
    cur.execute(
        "INSERT INTO edge(a, b, relation, source, confidence) VALUES (?,?,?,?,?)",
        (a, b, relation, source, conf),
    )


def load_file(conn, path, source, limit=None, dry=False, sample=400):
    """Load a CSV into the identity graph (best-effort column detection)."""
    cur = conn.cursor()
    rows_loaded = 0
    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        for i, row in enumerate(reader):
            if limit and i >= limit:
                break
            ids = []
            for h, val in row.items():
                if not val or not str(val).strip():
                    continue
                kind = h.lower().strip()
                if any(k in kind for k in ("email", "mail")):
                    kind = "email"
                elif "phone" in kind or "mobile" in kind:
                    kind = "phone"
                elif "name" in kind:
                    kind = "name"
                else:
                    kind = "other"
                if not dry:
                    iid = upsert_identifier(cur, kind, str(val).strip().lower(), source, raw=str(val))
                    if iid:
                        ids.append(iid)
            if not dry and len(ids) >= 2:
                for a in ids:
                    for b in ids:
                        if a < b:
                            link(cur, a, b, "co_occurrence", source)
            rows_loaded += 1
    if not dry:
        conn.commit()
    return {"path": path, "rows": rows_loaded, "dry": dry, "headers": headers}


def load_all(conn, directory, limit_per_file=None, dry=False):
    results = []
    root = Path(directory)
    for p in sorted(root.rglob("*.csv")):
        results.append(load_file(conn, str(p), source=p.name, limit=limit_per_file, dry=dry))
    return {"directory": directory, "files": results}


def sg_resolve(conn, kind, value, max_depth=2):
    cur = conn.cursor()
    cur.execute("SELECT id, kind, value, source FROM identifier WHERE kind=? AND value=?", (kind, value))
    root = cur.fetchone()
    if not root:
        cur.execute("SELECT id, kind, value, source FROM identifier WHERE value=? LIMIT 5", (value,))
        hits = [dict(r) for r in cur.fetchall()]
        return {"found": False, "suggestions": hits}
    seen = {root[0]}
    nodes = [{"id": root[0], "kind": root[1], "value": root[2], "source": root[3]}]
    edges = []
    frontier = [root[0]]
    depth = 0
    while frontier and depth < max_depth:
        nxt = []
        for nid in frontier:
            cur.execute("SELECT id, a, b, relation, source FROM edge WHERE a=? OR b=?", (nid, nid))
            for e in cur.fetchall():
                other = e[2] if e[1] == nid else e[1]
                edges.append({"id": e[0], "a": e[1], "b": e[2], "relation": e[3], "source": e[4]})
                if other not in seen:
                    seen.add(other)
                    cur.execute("SELECT id, kind, value, source FROM identifier WHERE id=?", (other,))
                    r = cur.fetchone()
                    if r:
                        nodes.append({"id": r[0], "kind": r[1], "value": r[2], "source": r[3]})
                        nxt.append(other)
        frontier = nxt
        depth += 1
    return {"found": True, "nodes": nodes, "edges": edges, "depth": depth}


def detect_kind(value):
    from osint_collectors import norm_phone, norm_aadhaar, norm_pan, norm_epic, norm_vehicle

    for kind, fn in [
        ("phone", norm_phone),
        ("aadhaar", norm_aadhaar),
        ("pan", norm_pan),
        ("epic", norm_epic),
        ("vehicle", norm_vehicle),
        (
            "email",
            lambda x: x.strip().lower()
            if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", x.strip())
            else None,
        ),
        ("name", lambda x: x.strip().lower()),
    ]:
        try:
            if fn(value):
                return kind, fn(value)
        except Exception:
            pass
    return "name", value.strip().lower()
