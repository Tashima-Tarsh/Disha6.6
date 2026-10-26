from __future__ import annotations


def _payload(component: str, raw_text: str = "Assess this public infrastructure note and preserve evidence.") -> dict:
    return {
        "contractVersion": "disha.research-runtime.v1",
        "requestId": f"request-{component}",
        "missionId": "mission-1",
        "component": component,
        "mode": "read_only",
        "rawText": raw_text,
        "context": {
            "selectedLenses": ["strategy"],
            "evidenceEventIds": ["evidence-1"],
            "sensitivity": "public",
        },
        "constraints": {
            "noExternalActions": True,
            "noStateMutation": True,
            "requireSourceHashes": True,
            "maxRuntimeMs": 2500,
        },
    }


def test_governed_runtime_health_and_analysis_are_read_only():
    from fastapi.testclient import TestClient

    from disha.brain.api.routes import context
    from disha.brain.app import app
    from disha.brain.config import settings

    original_token = settings.api_token
    settings.api_token = "test-governed-token"
    try:
        client = TestClient(app)
        headers = {"Authorization": "Bearer test-governed-token"}
        health = client.get("/api/v1/governed/health", headers=headers)
        assert health.status_code == 200
        body = health.json()
        assert body["contractVersion"] == "disha.research-runtime.v1"
        assert body["components"] == ["disha-brain", "cognitive-engine", "memory-graph"]

        audit_before = len(context.graph.ledger.export())
        episodic_before = len(context.graph.memory.episodic.items)
        response = client.post("/api/v1/governed/analyze", headers=headers, json=_payload("disha-brain"))
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "ok"
        assert result["component"] == "disha-brain"
        assert result["sourceHashes"]
        assert all(len(value) == 64 for value in result["sourceHashes"])
        assert "read-only" in " ".join(result["limitations"]).lower()
        assert len(context.graph.ledger.export()) == audit_before
        assert len(context.graph.memory.episodic.items) == episodic_before
    finally:
        settings.api_token = original_token


def test_governed_components_are_distinct_analyzers():
    from fastapi.testclient import TestClient

    from disha.brain.app import app
    from disha.brain.config import settings

    original_token = settings.api_token
    settings.api_token = "test-governed-token"
    try:
        client = TestClient(app)
        headers = {"Authorization": "Bearer test-governed-token"}
        text = "Acme Infrastructure may have delayed the bridge because rainfall was high. Acme Infrastructure did not confirm the delay. Revenue was 42 percent."
        outputs = {}
        for component in ("disha-brain", "cognitive-engine", "memory-graph"):
            response = client.post("/api/v1/governed/analyze", headers=headers, json=_payload(component, text))
            assert response.status_code == 200
            outputs[component] = response.json()

        assert outputs["disha-brain"]["summary"] != outputs["cognitive-engine"]["summary"]
        assert outputs["memory-graph"]["summary"] != outputs["cognitive-engine"]["summary"]
        cognitive_titles = " ".join(item["title"] for item in outputs["cognitive-engine"]["observations"])
        memory_titles = " ".join(item["title"] for item in outputs["memory-graph"]["observations"])
        assert "hypoth" in cognitive_titles.lower() or "uncertainty" in cognitive_titles.lower()
        assert "memory graph" in memory_titles.lower()
    finally:
        settings.api_token = original_token


def test_governed_runtime_rejects_external_action_contract():
    from fastapi.testclient import TestClient

    from disha.brain.app import app
    from disha.brain.config import settings

    original_token = settings.api_token
    settings.api_token = "test-governed-token"
    try:
        client = TestClient(app)
        payload = _payload("disha-brain", "test")
        payload["constraints"]["noExternalActions"] = False
        response = client.post(
            "/api/v1/governed/analyze",
            headers={"Authorization": "Bearer test-governed-token"},
            json=payload,
        )
        assert response.status_code == 400
    finally:
        settings.api_token = original_token
