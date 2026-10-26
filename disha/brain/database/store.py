from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from ..config import settings
from ..models.schemas import MemoryItem, TelemetryEvent
from .schema import SCHEMA_SQL


class SQLiteStore:
    def __init__(self, database_path: str | None = None) -> None:
        self.database_path = database_path or settings.database_path
        Path(self.database_path).parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.database_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=5000;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _initialize(self) -> None:
        with self.connection() as conn:
            conn.executescript(SCHEMA_SQL)

    def add_memory(self, item: MemoryItem) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                insert into memory (user_id, kind, content, metadata_json)
                values (?, ?, ?, ?)
                """,
                (item.user_id, item.kind, item.content, json.dumps(item.metadata)),
            )

    def list_memory(self, user_id: str, limit: int = 20) -> list[dict[str, Any]]:
        with self.connection() as conn:
            rows = conn.execute(
                """
                select id, user_id, kind, content, metadata_json, created_at
                from memory
                where user_id = ?
                order by id desc
                limit ?
                """,
                (user_id, limit),
            ).fetchall()
        return [dict(row) for row in rows]

    def add_event(self, event_type: str, source: str, payload: dict[str, Any]) -> int:
        with self.connection() as conn:
            cursor = conn.execute(
                """
                insert into events (event_type, source, payload_json)
                values (?, ?, ?)
                """,
                (event_type, source, json.dumps(payload)),
            )
            return int(cursor.lastrowid)

    def add_web_audit_event(self, event: dict[str, Any]) -> int:
        with self.connection() as conn:
            cursor = conn.execute(
                """
                insert into web_audit_events (request_id, user_id, action, resource, outcome, metadata_json)
                values (?, ?, ?, ?, ?, ?)
                """,
                (
                    str(event.get("requestId", "")),
                    event.get("userId"),
                    str(event.get("action", "")),
                    event.get("resource"),
                    str(event.get("outcome", "")),
                    json.dumps(event.get("metadata") or {}),
                ),
            )
            return int(cursor.lastrowid)

    def get_ai_cache(self, cache_key: str) -> dict[str, Any] | None:
        with self.connection() as conn:
            row = conn.execute(
                "select cache_key, content_type, body_text, created_at from ai_cache where cache_key = ?",
                (cache_key,),
            ).fetchone()
        return dict(row) if row else None

    def set_ai_cache(
        self, cache_key: str, content_type: str, body_text: str, created_at: int
    ) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                insert into ai_cache (cache_key, content_type, body_text, created_at)
                values (?, ?, ?, ?)
                on conflict(cache_key) do update set
                  content_type=excluded.content_type,
                  body_text=excluded.body_text,
                  created_at=excluded.created_at
                """,
                (cache_key, content_type, body_text, created_at),
            )

    def upsert_graph(
        self, user_id: str, nodes: list[dict[str, Any]], edges: list[dict[str, Any]]
    ) -> None:
        with self.connection() as conn:
            for n in nodes:
                conn.execute(
                    """
                    insert into memory_graph_nodes (user_id, node_id, label, kind, weight)
                    values (?, ?, ?, ?, ?)
                    on conflict(user_id, node_id) do update set
                      label=excluded.label,
                      kind=excluded.kind,
                      weight=memory_graph_nodes.weight + excluded.weight
                    """,
                    (user_id, n["id"], n["label"], n["kind"], float(n["weight"])),
                )
            for e in edges:
                edge_id = f"{e['from']}=>{e['to']}:{e['kind']}"
                conn.execute(
                    """
                    insert into memory_graph_edges (user_id, edge_id, from_id, to_id, kind, weight)
                    values (?, ?, ?, ?, ?, ?)
                    on conflict(user_id, edge_id) do update set
                      weight=memory_graph_edges.weight + excluded.weight
                    """,
                    (
                        user_id,
                        edge_id,
                        e["from"],
                        e["to"],
                        e["kind"],
                        float(e["weight"]),
                    ),
                )

    def get_graph(self, user_id: str, limit: int = 200) -> dict[str, Any]:
        with self.connection() as conn:
            nodes = conn.execute(
                """
                select node_id as id, label, kind, weight
                from memory_graph_nodes
                where user_id = ?
                order by weight desc
                limit ?
                """,
                (user_id, limit),
            ).fetchall()
            edges = conn.execute(
                """
                select from_id as "from", to_id as "to", kind, weight
                from memory_graph_edges
                where user_id = ?
                order by weight desc
                limit ?
                """,
                (user_id, limit),
            ).fetchall()
        return {"nodes": [dict(r) for r in nodes], "edges": [dict(r) for r in edges]}

    def add_risk_log(
        self,
        user_id: str,
        device_id: str,
        risk_level: str,
        score: float,
        action: str,
        reasons: list[str],
    ) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                insert into risk_logs (user_id, device_id, risk_level, score, action, reasons_json)
                values (?, ?, ?, ?, ?, ?)
                """,
                (user_id, device_id, risk_level, score, action, json.dumps(reasons)),
            )

    def add_telemetry(self, event: TelemetryEvent) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                insert into telemetry (
                  device_id, user_id, cpu_percent, memory_percent, process_count,
                  network_sent_kb, network_recv_kb, active_app
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.device_id,
                    event.user_id,
                    event.cpu_percent,
                    event.memory_percent,
                    event.process_count,
                    event.network_sent_kb,
                    event.network_recv_kb,
                    event.active_app,
                ),
            )

    def recent_telemetry(self, device_id: str, limit: int = 50) -> list[dict[str, Any]]:
        with self.connection() as conn:
            rows = conn.execute(
                """
                select * from telemetry
                where device_id = ?
                order by id desc
                limit ?
                """,
                (device_id, limit),
            ).fetchall()
        return [dict(row) for row in reversed(rows)]
