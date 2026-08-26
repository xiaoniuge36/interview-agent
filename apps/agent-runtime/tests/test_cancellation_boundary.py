import asyncio
import logging
from types import SimpleNamespace
from typing import TypeVar, cast

import pytest
from app.config import RuntimeSettings
from app.errors import RuntimeRequestError
from app.main import next_turn, practice_report
from app.model_gateway import ModelGatewayRequest
from app.schemas.interview import NextInterviewRequest
from app.schemas.practice_report import PracticeReportRequest
from app.workflows.interview_graph import create_interview_graph
from app.workflows.practice_report_graph import create_practice_report_graph
from fastapi import Request

INTERNAL_TOKEN = "runtime-test-token-with-at-least-32-characters"
GRANT = "signed-runtime-grant.payload-signature"
T = TypeVar("T")


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
    def __init__(self, state: SimpleNamespace) -> None:
        self.app = SimpleNamespace(state=state)
        self.disconnected = asyncio.Event()

    async def receive(self) -> dict[str, str]:
        await self.disconnected.wait()
        return {"type": "http.disconnect"}


def runtime_settings(monkeypatch: pytest.MonkeyPatch) -> RuntimeSettings:
    monkeypatch.setenv("INTERNAL_AGENT_TOKEN", INTERNAL_TOKEN)
    monkeypatch.setenv("NODE_ENV", "test")
    monkeypatch.delenv("AGENT_RUNTIME_MODEL_GATEWAY_URL", raising=False)
    monkeypatch.delenv("AGENT_RUNTIME_CHECKPOINT_DATABASE_URL", raising=False)
    return RuntimeSettings()


def interview_request() -> NextInterviewRequest:
    return NextInterviewRequest.model_validate(
        {
            "contractVersion": "interview-runtime.v1",
            "commandId": "command-test-0001",
            "traceId": "trace-test-0001",
            "modelInvocationGrant": GRANT,
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
    )


def report_request() -> PracticeReportRequest:
    return PracticeReportRequest.model_validate(
        {
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
            "modelInvocationGrant": GRANT,
        }
    )


async def assert_cancelled(
    operation: "asyncio.Task[T]",
    gateway: BlockingGateway,
    request: DisconnectingRequest,
) -> None:
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


@pytest.mark.anyio
async def test_cancels_provider_work_when_runtime_client_disconnects(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO, logger="agent_runtime.lifecycle")
    gateway = BlockingGateway()
    request = DisconnectingRequest(
        SimpleNamespace(
            interview_graph=create_interview_graph(gateway),
            settings=runtime_settings(monkeypatch),
        )
    )
    operation = asyncio.create_task(next_turn(cast(Request, request), interview_request()))

    await assert_cancelled(operation, gateway, request)

    log_output = " ".join(record.getMessage() for record in caplog.records)
    assert "runtime_request_cancelled" in log_output
    assert GRANT not in log_output


@pytest.mark.anyio
async def test_cancels_report_work_when_runtime_client_disconnects(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO, logger="agent_runtime.lifecycle")
    gateway = BlockingGateway()
    request = DisconnectingRequest(
        SimpleNamespace(
            practice_report_graph=create_practice_report_graph(gateway),
            settings=runtime_settings(monkeypatch),
        )
    )
    operation = asyncio.create_task(practice_report(cast(Request, request), report_request()))

    await assert_cancelled(operation, gateway, request)

    log_output = " ".join(record.getMessage() for record in caplog.records)
    assert "runtime_request_cancelled" in log_output
    assert GRANT not in log_output
