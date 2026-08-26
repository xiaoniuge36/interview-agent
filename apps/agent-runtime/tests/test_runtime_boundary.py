from collections.abc import Iterator

import pytest
from app.config import DEFAULT_BODY_LIMIT_BYTES, get_settings
from app.main import app
from app.model_gateway import ModelGatewayError, ModelGatewayRequest
from app.schemas.interview import NextInterviewRequest
from app.workflows.interview_graph import create_interview_graph
from app.workflows.practice_report_graph import create_practice_report_graph
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
    monkeypatch.delenv("AGENT_RUNTIME_MODEL_GATEWAY_URL", raising=False)
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
