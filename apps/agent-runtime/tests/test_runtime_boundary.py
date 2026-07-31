import asyncio
import logging
from collections.abc import Iterator
from types import SimpleNamespace
from typing import cast

import pytest
from app.config import DEFAULT_BODY_LIMIT_BYTES, get_settings
from app.errors import RuntimeRequestError
from app.main import app, next_turn
from app.model_gateway import ModelGatewayError, ModelGatewayRequest
from app.schemas.interview import NextInterviewRequest
from app.workflows.interview_graph import create_interview_graph
from app.workflows.practice_report_graph import create_practice_report_graph
from fastapi import Request
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


def report_payload() -> dict[str, object]:
    return {
        "contractVersion": "practice-report-runtime.v1",
        "session": {
            "id": "practice-1",
            "tenantId": "personal",
            "userId": "demo-user",
            "title": "System design",
        },
        "evaluations": [
            {
                "itemId": "item-1",
                "questionId": "question-1",
                "questionTitle": "Design a rate limiter",
                "questionTags": ["system-design"],
                "score": 72,
                "feedback": "The boundary is clear.",
                "missingPoints": ["Capacity planning"],
            }
        ],
        "commandId": "practice-report:practice-1",
        "traceId": "trace-test-0001",
        "modelInvocationGrant": "signed-runtime-grant.payload-signature",
    }


class BlockingGateway:
    def __init__(self) -> None:
        self.started = asyncio.Event()
        self.release = asyncio.Event()
        self.cancelled = asyncio.Event()
        self.calls = 0
        self.completed = 0

    async def complete(self, _request: ModelGatewayRequest) -> str:
        self.calls += 1
        self.started.set()
        try:
            await self.release.wait()
        except asyncio.CancelledError:
            self.cancelled.set()
            raise
        self.completed += 1
        return '{"stage":"jd_core","content":"请继续说明关键取舍。","shouldFinish":false}'


class DisconnectingRequest:
    def __init__(self, graph: object) -> None:
        self.app = SimpleNamespace(state=SimpleNamespace(interview_graph=graph))
        self.disconnected = asyncio.Event()

    async def receive(self) -> dict[str, str]:
        await self.disconnected.wait()
        return {"type": "http.disconnect"}


class BlockedEndpointGateway:
    def __init__(self) -> None:
        self.calls = 0

    async def complete(self, _request: ModelGatewayRequest) -> str:
        self.calls += 1
        raise ModelGatewayError("MODEL_PROVIDER_ENDPOINT_BLOCKED", retryable=False)


def payload_with_grant() -> NextInterviewRequest:
    request = payload()
    request["modelInvocationGrant"] = "signed-runtime-grant.payload-signature"
    return NextInterviewRequest.model_validate(request)


def test_rejects_external_request(client: TestClient) -> None:
    response = client.post("/interviews/next", json=payload())

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_SERVICE_IDENTITY"


@pytest.mark.anyio
async def test_cancels_provider_work_when_runtime_client_disconnects(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO, logger="agent_runtime.lifecycle")
    gateway = BlockingGateway()
    request = DisconnectingRequest(create_interview_graph(gateway))
    operation = asyncio.create_task(next_turn(cast(Request, request), payload_with_grant()))

    await gateway.started.wait()
    request.disconnected.set()
    await asyncio.wait_for(gateway.cancelled.wait(), timeout=1)
    gateway.release.set()

    with pytest.raises(RuntimeRequestError) as error:
        await operation

    assert error.value.error.status_code == 499
    assert error.value.error.code == "REQUEST_CANCELLED"
    assert gateway.calls == 1
    assert gateway.completed == 0
    log_output = " ".join(record.getMessage() for record in caplog.records)
    assert "runtime_request_cancelled" in log_output
    assert "signed-runtime-grant" not in log_output


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


def test_practice_report_endpoint_returns_deterministic_fallback_without_provider(
    client: TestClient,
) -> None:
    response = client.post("/practice/report", json=report_payload(), headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json()["contractVersion"] == "practice-report-runtime.v1"
    assert response.json()["overallScore"] == 72
    assert response.json()["fallbackUsed"] is True


def test_returns_blocked_provider_endpoint_as_a_non_retryable_interview_error(
    client: TestClient,
) -> None:
    gateway = BlockedEndpointGateway()
    app.state.interview_graph = create_interview_graph(gateway)

    response = client.post(
        "/interviews/next",
        json=payload_with_grant().model_dump(by_alias=True),
        headers=AUTH_HEADERS,
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "MODEL_PROVIDER_ENDPOINT_BLOCKED"
    assert gateway.calls == 1


def test_returns_blocked_provider_endpoint_as_a_non_retryable_report_error(
    client: TestClient,
) -> None:
    gateway = BlockedEndpointGateway()
    app.state.practice_report_graph = create_practice_report_graph(gateway)

    response = client.post("/practice/report", json=report_payload(), headers=AUTH_HEADERS)

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "MODEL_PROVIDER_ENDPOINT_BLOCKED"
    assert gateway.calls == 1


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
