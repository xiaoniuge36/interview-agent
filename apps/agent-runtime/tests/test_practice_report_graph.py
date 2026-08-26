import asyncio
import logging

import pytest
from app.model_gateway import ModelGatewayError, ModelGatewayRequest
from app.schemas.practice_report import PracticeReportRequest
from app.workflows.practice_report_graph import (
    PracticeReportGraphError,
    create_practice_report_graph,
    practice_report_thread_id,
    run_practice_report_graph,
)
from langgraph.checkpoint.memory import InMemorySaver


class FakeGateway:
    def __init__(self, responses: list[str | Exception]) -> None:
        self.responses = responses
        self.requests: list[ModelGatewayRequest] = []

    async def complete(self, request: ModelGatewayRequest) -> str:
        self.requests.append(request)
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


class BlockingGateway:
    async def complete(self, _request: ModelGatewayRequest) -> str:
        await asyncio.Event().wait()
        raise AssertionError("blocked gateway resumed")


def valid_request() -> PracticeReportRequest:
    return PracticeReportRequest.model_validate(
        {
            "contractVersion": "practice-report-runtime.v1",
            "session": {
                "id": "session-1",
                "tenantId": "tenant-1",
                "userId": "user-1",
                "title": "System design",
            },
            "evaluations": [
                {
                    "itemId": "item-1",
                    "questionId": "question-1",
                    "questionTitle": "Design a rate limiter",
                    "questionTags": ["system-design"],
                    "score": 72,
                    "feedback": "The main boundary is clear.",
                    "missingPoints": ["Capacity planning"],
                }
            ],
            "retrievalContext": [
                {
                    "sourceId": "chunk-1",
                    "entityType": "knowledge",
                    "content": "A capacity plan should state assumptions.",
                }
            ],
            "commandId": "practice-report:session-1",
            "traceId": "trace-practice-report-0001",
            "modelInvocationGrant": "signed-runtime-grant.payload-signature",
        }
    )


def valid_decision() -> str:
    return (
        '{"summary":"The round exposed one repeatable gap.",'
        '"strengths":["Explains the main boundary."],'
        '"weaknesses":["Capacity planning"],'
        '"nextActions":["Add a quantified capacity example."],'
        '"reportMarkdown":"# Practice report",'
        '"sourceIds":["chunk-1"]}'
    )


@pytest.mark.anyio
async def test_graph_returns_schema_valid_report_and_memory_events() -> None:
    gateway = FakeGateway([valid_decision()])
    result = await run_practice_report_graph(create_practice_report_graph(gateway), valid_request())

    assert result.fallback_used is False
    assert result.overall_score == 72
    assert result.source_ids == ["chunk-1"]
    assert result.memory_events[0].tag == "system-design"
    assert gateway.requests[0].output_schema_version == "practice-report-runtime.v1"


@pytest.mark.anyio
async def test_graph_repairs_one_invalid_model_response() -> None:
    gateway = FakeGateway(["not-json", valid_decision()])

    result = await run_practice_report_graph(create_practice_report_graph(gateway), valid_request())

    assert result.fallback_used is False
    assert len(gateway.requests) == 2
    assert "repair" in gateway.requests[1].system_prompt.lower()


@pytest.mark.anyio
async def test_graph_uses_deterministic_fallback_after_failed_repair(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.WARNING, logger="agent_runtime.practice_report_graph")
    gateway = FakeGateway(["not-json", "still-not-json"])

    result = await run_practice_report_graph(create_practice_report_graph(gateway), valid_request())

    assert result.fallback_used is True
    assert result.overall_score == 72
    assert result.weaknesses == ["Capacity planning"]
    assert result.source_ids == []
    events = [record.__dict__.get("event") for record in caplog.records]
    assert "practice_report_generation_failed" in events
    assert "practice_report_fallback_used" in events
    log_output = " ".join(
        str(value) for record in caplog.records for value in record.__dict__.values()
    )
    assert "signed-runtime-grant" not in log_output


@pytest.mark.anyio
async def test_graph_fails_fast_without_fallback_after_a_blocked_provider_endpoint() -> None:
    checkpointer = InMemorySaver()
    gateway = FakeGateway([ModelGatewayError("MODEL_PROVIDER_ENDPOINT_BLOCKED", retryable=False)])
    graph = create_practice_report_graph(gateway, checkpointer)
    request = valid_request()

    with pytest.raises(PracticeReportGraphError, match="MODEL_PROVIDER_ENDPOINT_BLOCKED"):
        await run_practice_report_graph(graph, request)

    assert len(gateway.requests) == 1
    stored = await checkpointer.aget_tuple(
        {"configurable": {"thread_id": practice_report_thread_id(request)}}
    )
    assert stored is not None
    assert "decision" not in stored.checkpoint["channel_values"]


@pytest.mark.anyio
async def test_graph_times_out_the_whole_run() -> None:
    graph = create_practice_report_graph(BlockingGateway())

    with pytest.raises(PracticeReportGraphError, match="MODEL_PROVIDER_TIMEOUT"):
        await run_practice_report_graph(graph, valid_request(), timeout_seconds=0.05)


@pytest.mark.anyio
async def test_checkpoint_reuses_completed_report_without_repeating_model_call() -> None:
    checkpointer = InMemorySaver()
    gateway = FakeGateway([valid_decision()])
    graph = create_practice_report_graph(gateway, checkpointer)
    request = valid_request()

    first = await run_practice_report_graph(graph, request)
    second = await run_practice_report_graph(graph, request)
    stored = await checkpointer.aget_tuple(
        {"configurable": {"thread_id": practice_report_thread_id(request)}}
    )

    assert first == second
    assert len(gateway.requests) == 1
    assert stored is not None
    grant = request.model_invocation_grant
    assert grant is not None
    assert grant not in repr(stored.checkpoint["channel_values"])
    assert "raw_decision" not in stored.checkpoint["channel_values"]


@pytest.mark.anyio
async def test_graph_without_checkpointer_recomputes_each_invocation() -> None:
    gateway = FakeGateway([valid_decision(), valid_decision()])
    graph = create_practice_report_graph(gateway)
    request = valid_request()

    first = await run_practice_report_graph(graph, request)
    second = await run_practice_report_graph(graph, request)

    assert first == second
    assert len(gateway.requests) == 2


@pytest.mark.anyio
async def test_graph_requires_a_model_invocation_grant() -> None:
    request = valid_request()
    request.model_invocation_grant = None

    with pytest.raises(PracticeReportGraphError, match="MODEL_INVOCATION_GRANT_REQUIRED"):
        await run_practice_report_graph(create_practice_report_graph(FakeGateway([])), request)
