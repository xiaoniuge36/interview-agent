from collections.abc import Iterator

import pytest
from app.config import DEFAULT_BODY_LIMIT_BYTES, get_settings
from app.main import app
from fastapi.testclient import TestClient

INTERNAL_TOKEN = "runtime-test-token-with-at-least-32-characters"
AUTH_HEADERS = {
    "x-internal-agent-token": INTERNAL_TOKEN,
    "x-service-name": "product-api",
    "x-trace-id": "trace-test-0001",
}


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setenv("INTERNAL_AGENT_TOKEN", INTERNAL_TOKEN)
    monkeypatch.setenv("NODE_ENV", "test")
    monkeypatch.delenv("AGENT_RUNTIME_CHECKPOINT_DATABASE_URL", raising=False)
    get_settings.cache_clear()
    with TestClient(app) as runtime_client:
        yield runtime_client
    get_settings.cache_clear()


def payload() -> dict[str, object]:
    return {
        "contractVersion": "interview-runtime.v1",
        "commandId": "command-test-0001",
        "traceId": "trace-test-0001",
        "session": {
            "id": "interview-test-0001",
            "tenantId": "personal",
            "userId": "demo-user",
            "status": "created",
            "stage": "warmup",
            "version": 0,
            "title": "后端开发工程师模拟面试",
            "candidateTurnCount": 0,
            "recentTurns": [],
        },
    }


def test_rejects_external_request(client: TestClient) -> None:
    response = client.post("/interviews/next", json=payload())

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_SERVICE_IDENTITY"


def test_rejects_contract_version_drift(client: TestClient) -> None:
    invalid = payload()
    invalid["contractVersion"] = "interview-runtime.v0"

    response = client.post("/interviews/next", json=invalid, headers=AUTH_HEADERS)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_FAILED"
    assert "input" not in response.text


def test_returns_versioned_structured_decision(client: TestClient) -> None:
    response = client.post("/interviews/next", json=payload(), headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.headers["x-trace-id"] == "trace-test-0001"
    assert response.headers["x-content-type-options"] == "nosniff"
    content = response.json()["content"]
    assert response.json()["contractVersion"] == "interview-runtime.v1"
    assert response.json()["stage"] == "warmup"
    assert response.json()["shouldFinish"] is False
    assert "后端开发工程师" in content
    assert "系统边界" in content


@pytest.mark.parametrize(
    ("title", "expected_focus"),
    [
        ("后端开发工程师", "系统边界"),
        ("数据分析师", "指标口径"),
        ("AI Agent 工程师", "工作流设计"),
        ("产品经理", "用户问题"),
        ("增长运营", "目标人群"),
        ("客户成功经理", "客户场景"),
    ],
)
def test_selects_role_specific_warmup_prompt(
    client: TestClient,
    title: str,
    expected_focus: str,
) -> None:
    request = payload()
    session = request["session"]
    assert isinstance(session, dict)
    session["title"] = f"{title}模拟面试"

    response = client.post("/interviews/next", json=request, headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert expected_focus in response.json()["content"]


def test_exposes_liveness_and_readiness(client: TestClient) -> None:
    live = client.get("/health/live")
    ready = client.get("/health/ready")

    assert live.status_code == 200
    assert live.json() == {"status": "ok", "service": "agent-runtime"}
    assert ready.status_code == 200
    assert ready.json()["status"] == "ready"
    assert ready.json()["checks"]["configuration"]["environment"] == "test"


def test_rejects_oversized_request_body(client: TestClient) -> None:
    body = b"x" * (DEFAULT_BODY_LIMIT_BYTES + 1)

    response = client.post(
        "/interviews/next",
        content=body,
        headers={**AUTH_HEADERS, "content-type": "application/json"},
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "REQUEST_BODY_TOO_LARGE"


def test_logs_only_request_metadata(
    client: TestClient,
    caplog: pytest.LogCaptureFixture,
) -> None:
    sensitive_answer = "sensitive-candidate-answer"
    request = payload()
    request["answer"] = sensitive_answer

    response = client.post("/interviews/next", json=request, headers=AUTH_HEADERS)
    log_output = " ".join(
        str(value) for record in caplog.records for value in record.__dict__.values()
    )

    assert response.status_code == 200
    assert sensitive_answer not in log_output
    assert INTERNAL_TOKEN not in log_output
    assert "runtime_request_completed" in log_output
