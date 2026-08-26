import json
from collections.abc import Iterator
from types import SimpleNamespace
from typing import cast

import psycopg
import pytest
from app.config import RuntimeSettings, get_settings
from app.main import app, readiness
from fastapi import Request
from fastapi.testclient import TestClient

INTERNAL_TOKEN = "runtime-test-token-with-at-least-32-characters"
GATEWAY_URL = "http://product-api.test/api/internal/model-invocations"
DATABASE_URL = "postgresql://runtime:runtime-secret@127.0.0.1:5432/runtime"
UNREACHABLE_DATABASE_URL = "postgresql://runtime:runtime-secret@127.0.0.1:9/runtime"


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setenv("INTERNAL_AGENT_TOKEN", INTERNAL_TOKEN)
    monkeypatch.setenv("NODE_ENV", "test")
    monkeypatch.delenv("AGENT_RUNTIME_MODEL_GATEWAY_URL", raising=False)
    monkeypatch.delenv("AGENT_RUNTIME_CHECKPOINT_DATABASE_URL", raising=False)
    get_settings.cache_clear()
    with TestClient(app) as runtime_client:
        yield runtime_client
    get_settings.cache_clear()


def runtime_settings(
    monkeypatch: pytest.MonkeyPatch,
    *,
    gateway_url: str | None,
    database_url: str | None = None,
) -> RuntimeSettings:
    monkeypatch.setenv("INTERNAL_AGENT_TOKEN", INTERNAL_TOKEN)
    monkeypatch.setenv("NODE_ENV", "test")
    if gateway_url is None:
        monkeypatch.delenv("AGENT_RUNTIME_MODEL_GATEWAY_URL", raising=False)
    else:
        monkeypatch.setenv("AGENT_RUNTIME_MODEL_GATEWAY_URL", gateway_url)
    if database_url is None:
        monkeypatch.delenv("AGENT_RUNTIME_CHECKPOINT_DATABASE_URL", raising=False)
    else:
        monkeypatch.setenv("AGENT_RUNTIME_CHECKPOINT_DATABASE_URL", database_url)
    return RuntimeSettings()


def settings_request(settings: RuntimeSettings) -> Request:
    return cast(
        Request,
        SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(settings=settings))),
    )


def test_liveness_reports_ok(client: TestClient) -> None:
    live = client.get("/health/live")

    assert live.status_code == 200
    assert live.json() == {"status": "ok", "service": "agent-runtime"}


def test_readiness_reports_unavailable_without_model_gateway(client: TestClient) -> None:
    ready = client.get("/health/ready")

    assert ready.status_code == 503
    document = ready.json()
    assert document["status"] == "unavailable"
    assert document["checks"]["configuration"]["environment"] == "test"
    assert document["checks"]["model_gateway"]["status"] == "down"
    assert document["checks"]["checkpoint_database"] == {"status": "up", "configured": False}


@pytest.mark.anyio
async def test_readiness_reports_ready_with_gateway_and_no_checkpoint_database(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = runtime_settings(monkeypatch, gateway_url=GATEWAY_URL)

    response = await readiness(settings_request(settings))

    assert response.status_code == 200
    document = json.loads(bytes(response.body))
    assert document["status"] == "ready"
    assert document["checks"]["model_gateway"]["status"] == "up"
    assert document["checks"]["checkpoint_database"] == {"status": "up", "configured": False}


@pytest.mark.anyio
async def test_readiness_runs_a_probe_and_reports_ready_when_it_succeeds(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    probed: list[str] = []

    async def healthy_probe(connection_url: str) -> None:
        probed.append(connection_url)

    monkeypatch.setattr("app.main.probe_checkpoint_database", healthy_probe)
    settings = runtime_settings(monkeypatch, gateway_url=GATEWAY_URL, database_url=DATABASE_URL)

    response = await readiness(settings_request(settings))

    assert response.status_code == 200
    document = json.loads(bytes(response.body))
    assert document["checks"]["checkpoint_database"] == {"status": "up", "configured": True}
    assert probed == [f"{DATABASE_URL}?connect_timeout=5"]


@pytest.mark.anyio
async def test_readiness_fails_when_checkpoint_database_probe_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def failing_probe(_connection_url: str) -> None:
        raise psycopg.OperationalError("connection refused")

    monkeypatch.setattr("app.main.probe_checkpoint_database", failing_probe)
    settings = runtime_settings(monkeypatch, gateway_url=GATEWAY_URL, database_url=DATABASE_URL)

    response = await readiness(settings_request(settings))

    assert response.status_code == 503
    document = json.loads(bytes(response.body))
    assert document["status"] == "unavailable"
    assert document["checks"]["checkpoint_database"] == {"status": "down", "configured": True}


@pytest.mark.anyio
async def test_readiness_fails_fast_for_an_unreachable_checkpoint_database(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = runtime_settings(
        monkeypatch, gateway_url=GATEWAY_URL, database_url=UNREACHABLE_DATABASE_URL
    )

    response = await readiness(settings_request(settings))

    assert response.status_code == 503
    document = json.loads(bytes(response.body))
    assert document["checks"]["checkpoint_database"] == {"status": "down", "configured": True}
