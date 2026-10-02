from __future__ import annotations

import asyncio

import pytest


def exchange(headers: list[tuple[bytes, bytes]]) -> list[dict]:
    from disha.brain.app import app

    async def run() -> list[dict]:
        events = iter([
            {"type": "websocket.connect"},
            {"type": "websocket.disconnect", "code": 1000},
        ])
        sent: list[dict] = []

        async def receive() -> dict:
            return next(events)

        async def send(message: dict) -> None:
            sent.append(message)

        await app({
            "type": "websocket", "asgi": {"version": "3.0"},
            "scheme": "ws", "path": "/ws/alerts", "raw_path": b"/ws/alerts",
            "query_string": b"", "headers": headers,
            "client": ("127.0.0.1", 1234), "server": ("testserver", 80),
            "subprotocols": [], "root_path": "",
        }, receive, send)
        return sent

    return asyncio.run(run())


def test_alerts_require_authentication(monkeypatch: pytest.MonkeyPatch) -> None:
    from disha.brain.config import settings
    monkeypatch.setattr(settings, "api_token", "test-only-websocket-token")
    assert exchange([]) == [{"type": "websocket.close", "code": 1008, "reason": ""}]
    accepted = exchange([(b"authorization", b"Bearer test-only-websocket-token")])
    assert accepted[0]["type"] == "websocket.accept"


def test_alerts_reject_untrusted_browser_origin(monkeypatch: pytest.MonkeyPatch) -> None:
    from disha.brain.config import settings
    monkeypatch.setattr(settings, "api_token", "test-only-websocket-token")
    rejected = exchange([
        (b"authorization", b"Bearer test-only-websocket-token"),
        (b"origin", b"https://untrusted.example"),
    ])
    assert rejected[0]["type"] == "websocket.close"
    assert rejected[0]["code"] == 1008
