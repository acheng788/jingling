import pytest
from fastapi.testclient import TestClient

from app.db import database as database_module
from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database_module, "database_path", lambda: tmp_path / "test.db")
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "jingling-api"}


def test_demo_model_status(client):
    response = client.get("/api/models/status")
    assert response.status_code == 200
    assert response.json()["provider"] == "demo"
    assert response.json()["mode"] == "demo"


def test_knowledge_create_and_list(client):
    created = client.post("/api/knowledge", json={"title": "风险控制", "content": "先评估风险再试点。"})
    assert created.status_code == 201
    item = created.json()
    assert item["title"] == "风险控制"
    listed = client.get("/api/knowledge")
    assert any(row["id"] == item["id"] for row in listed.json())


def test_decision_feedback_lifecycle(client):
    created = client.post("/api/decisions", json={"question": "如何降低新业务上线风险？"})
    assert created.status_code == 201
    decision = created.json()
    assert decision["provider"] == "demo"
    assert decision["status"] == "proposed"
    feedback = client.post(
        f"/api/decisions/{decision['id']}/feedback",
        json={"status": "completed", "feedback": "已复盘", "outcome": "风险下降"},
    )
    assert feedback.status_code == 200
    assert feedback.json()["status"] == "completed"
    assert feedback.json()["outcome"] == "风险下降"


def test_feedback_missing_decision_returns_404(client):
    response = client.post("/api/decisions/999999/feedback", json={"status": "accepted"})
    assert response.status_code == 404


def test_invalid_knowledge_payload_returns_422(client):
    response = client.post("/api/knowledge", json={"title": "", "content": ""})
    assert response.status_code == 422
