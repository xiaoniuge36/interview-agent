import pytest
from app.model_gateway import ModelGatewayError, ModelGatewayRequest
from app.schemas.interview import NextInterviewRequest
from app.workflows.interview_graph import (
    InterviewGraphError,
    create_interview_graph,
    graph_thread_id,
    run_interview_graph,
)
from langgraph.checkpoint.memory import InMemorySaver


class FakeGateway:
    def __init__(self, responses: list[str | Exception]) -> None:
        self.responses = responses
        self.grants: list[str] = []

    async def complete(self, request: ModelGatewayRequest) -> str:
        self.grants.append(request.grant)
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


def request_with_grant(tenant_id: str = "tenant-a") -> NextInterviewRequest:
    return NextInterviewRequest.model_validate(
        {
            "contractVersion": "interview-runtime.v1",
            "commandId": "command-test-0001",
            "traceId": "trace-test-0001",
            "modelInvocationGrant": "signed-runtime-grant.payload-signature",
            "session": {
                "id": "interview-test-0001",
                "tenantId": tenant_id,
                "userId": "demo-user",
                "status": "running",
                "stage": "warmup",
                "version": 0,
                "title": "后端开发工程师模拟面试",
                "candidateTurnCount": 1,
                "recentTurns": [],
            },
            "answer": "我负责了订单系统的架构和并发治理。",
        }
    )


@pytest.mark.anyio
async def test_graph_uses_gateway_when_grant_is_present() -> None:
    gateway = FakeGateway(
        ['{"stage":"jd_core","content":"请展开关键技术取舍。","shouldFinish":false}']
    )
    graph = create_interview_graph(gateway)

    result = await run_interview_graph(graph, request_with_grant())

    assert result.stage == "jd_core"
    assert result.content == "请展开关键技术取舍。"
    assert gateway.grants == ["signed-runtime-grant.payload-signature"]


@pytest.mark.anyio
async def test_graph_rejects_invalid_gateway_json() -> None:
    graph = create_interview_graph(FakeGateway(["not-json"]))

    with pytest.raises(InterviewGraphError, match="MODEL_PROVIDER_RESPONSE_INVALID"):
        await run_interview_graph(graph, request_with_grant())


@pytest.mark.anyio
async def test_graph_retries_transient_gateway_failure() -> None:
    gateway = FakeGateway(
        [
            ModelGatewayError("MODEL_PROVIDER_UNAVAILABLE", retryable=True),
            '{"stage":"jd_core","content":"请展开关键技术取舍。","shouldFinish":false}',
        ]
    )
    graph = create_interview_graph(gateway)

    result = await run_interview_graph(graph, request_with_grant())

    assert result.stage == "jd_core"
    assert gateway.grants == [
        "signed-runtime-grant.payload-signature",
        "signed-runtime-grant.payload-signature",
    ]


@pytest.mark.anyio
async def test_graph_stops_after_transient_gateway_retry_limit() -> None:
    graph = create_interview_graph(
        FakeGateway(
            [
                ModelGatewayError("MODEL_PROVIDER_UNAVAILABLE", retryable=True),
                ModelGatewayError("MODEL_PROVIDER_UNAVAILABLE", retryable=True),
            ]
        )
    )

    with pytest.raises(InterviewGraphError, match="MODEL_PROVIDER_UNAVAILABLE"):
        await run_interview_graph(graph, request_with_grant())


@pytest.mark.anyio
async def test_graph_requires_a_grant() -> None:
    request = request_with_grant()
    request.model_invocation_grant = None
    graph = create_interview_graph(FakeGateway([]))

    with pytest.raises(InterviewGraphError, match="MODEL_INVOCATION_GRANT_REQUIRED"):
        await run_interview_graph(graph, request)


def test_thread_id_is_tenant_scoped() -> None:
    first = graph_thread_id(request_with_grant("tenant-a"))
    second = graph_thread_id(request_with_grant("tenant-b"))

    assert first == "tenant-a:interview-test-0001"
    assert second == "tenant-b:interview-test-0001"
    assert first != second


@pytest.mark.anyio
async def test_checkpoint_excludes_grant_and_raw_provider_response() -> None:
    checkpointer = InMemorySaver()
    request = request_with_grant()
    graph = create_interview_graph(
        FakeGateway(['{"stage":"jd_core","content":"请展开关键技术取舍。","shouldFinish":false}']),
        checkpointer,
    )

    await run_interview_graph(graph, request)
    stored = await checkpointer.aget_tuple(
        {"configurable": {"thread_id": graph_thread_id(request)}}
    )

    assert stored is not None
    channel_values = stored.checkpoint["channel_values"]
    grant = request.model_invocation_grant
    assert grant is not None
    assert grant not in repr(channel_values)
    assert "raw_decision" not in channel_values
