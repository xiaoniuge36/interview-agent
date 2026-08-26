"""Interview decision graph backed by the model gateway."""

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Protocol, cast

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph import END, START, StateGraph
from langgraph.runtime import Runtime
from pydantic import ValidationError
from typing_extensions import TypedDict

from app.config import DEFAULT_GRAPH_TIMEOUT_SECONDS
from app.model_gateway import ModelGatewayError, ModelGatewayRequest
from app.schemas.interview import NextInterviewRequest, NextInterviewResponse
from app.workflows.interview_prompts import system_prompt, user_prompt
from app.workflows.shared import (
    ModelGateway,
    SleepFn,
    log_graph_event,
    retry_backoff_seconds,
    strip_code_fence,
)

MAX_GATEWAY_ATTEMPTS = 2
LOGGER = logging.getLogger("agent_runtime.interview_graph")


class InterviewGraphState(TypedDict, total=False):
    request: NextInterviewRequest
    decision: NextInterviewResponse
    attempt: int
    failure_code: str
    retryable: bool
    retry_after_seconds: float | None


@dataclass(slots=True)
class InterviewGraphContext:
    grant: str
    raw_decision: str | None = None


class InterviewGraphRunner(Protocol):
    async def ainvoke(
        self,
        state: InterviewGraphState,
        config: dict[str, object],
        *,
        context: InterviewGraphContext,
    ) -> InterviewGraphState: ...


class GenerateDecisionNode(Protocol):
    async def __call__(
        self,
        state: InterviewGraphState,
        *,
        runtime: Runtime[InterviewGraphContext],
    ) -> InterviewGraphState: ...


class InterviewGraphError(Exception):
    pass


def create_interview_graph(
    gateway: ModelGateway,
    checkpointer: BaseCheckpointSaver[str] | None = None,
    retry_sleep: SleepFn | None = None,
) -> InterviewGraphRunner:
    graph: StateGraph[
        InterviewGraphState,
        InterviewGraphContext,
        InterviewGraphState,
        InterviewGraphState,
    ] = StateGraph(InterviewGraphState, context_schema=InterviewGraphContext)
    graph.add_node(
        "prepare_context",
        prepare_context,  # type: ignore[arg-type]
    )
    graph.add_node(
        "generate_decision",
        generate_decision_node(gateway, retry_sleep or asyncio.sleep),
    )
    graph.add_node("validate_decision", validate_decision)
    graph.add_node("failure", failure)
    graph.add_edge(START, "prepare_context")
    graph.add_edge("prepare_context", "generate_decision")
    graph.add_conditional_edges(
        "generate_decision",
        route_after_generation,
        {
            "retry": "generate_decision",
            "validate": "validate_decision",
            "failure": "failure",
        },
    )
    graph.add_edge("validate_decision", END)
    graph.add_edge("failure", END)
    compiled = graph.compile(checkpointer=checkpointer)
    return cast(InterviewGraphRunner, compiled)


async def run_interview_graph(
    graph: InterviewGraphRunner,
    request: NextInterviewRequest,
    timeout_seconds: float = DEFAULT_GRAPH_TIMEOUT_SECONDS,
) -> NextInterviewResponse:
    grant = request.model_invocation_grant
    if grant is None:
        raise InterviewGraphError("MODEL_INVOCATION_GRANT_REQUIRED")
    sanitized_request = request.model_copy(update={"model_invocation_grant": None})
    invocation = graph.ainvoke(
        {"request": sanitized_request, "attempt": 0},
        {"configurable": {"thread_id": graph_thread_id(request)}},
        context=InterviewGraphContext(grant=grant),
    )
    try:
        state = await asyncio.wait_for(invocation, timeout=timeout_seconds)
    except TimeoutError as error:
        log_graph_event(
            LOGGER,
            "interview_graph_timed_out",
            {
                "code": "MODEL_PROVIDER_TIMEOUT",
                "trace_id": request.trace_id,
                "session_id": request.session.id,
            },
        )
        raise InterviewGraphError("MODEL_PROVIDER_TIMEOUT") from error
    failure_code = state.get("failure_code")
    if failure_code:
        raise InterviewGraphError(failure_code)
    decision = state.get("decision")
    if decision is None:
        raise InterviewGraphError("MODEL_PROVIDER_RESPONSE_INVALID")
    return decision


def graph_thread_id(request: NextInterviewRequest) -> str:
    return f"{request.session.tenant_id}:{request.session.id}"


def prepare_context(
    _state: InterviewGraphState,
) -> InterviewGraphState:
    return {"attempt": 0, "failure_code": "", "retryable": False, "retry_after_seconds": None}


def generate_decision_node(
    gateway: ModelGateway,
    retry_sleep: SleepFn,
) -> GenerateDecisionNode:
    async def generate_decision(
        state: InterviewGraphState,
        *,
        runtime: Runtime[InterviewGraphContext],
    ) -> InterviewGraphState:
        request = state["request"]
        attempt = state.get("attempt", 0) + 1
        if attempt > 1:
            await retry_sleep(retry_backoff_seconds(attempt, state.get("retry_after_seconds")))
        try:
            runtime.context.raw_decision = await gateway.complete(
                ModelGatewayRequest(
                    grant=runtime.context.grant,
                    system_prompt=system_prompt(request),
                    user_prompt=user_prompt(request),
                    trace_id=request.trace_id,
                )
            )
        except ModelGatewayError as error:
            log_graph_event(
                LOGGER,
                "interview_generation_failed",
                {
                    "code": error.code,
                    "attempt": attempt,
                    "retryable": error.retryable,
                    "trace_id": request.trace_id,
                    "session_id": request.session.id,
                },
            )
            return gateway_failure_state(error, attempt)
        return {
            "attempt": attempt,
            "failure_code": "",
            "retryable": False,
            "retry_after_seconds": None,
        }

    return generate_decision


def route_after_generation(state: InterviewGraphState) -> str:
    if not state.get("failure_code"):
        return "validate"
    if state.get("retryable") and state.get("attempt", 0) < MAX_GATEWAY_ATTEMPTS:
        return "retry"
    return "failure"


def validate_decision(
    state: InterviewGraphState,
    *,
    runtime: Runtime[InterviewGraphContext],
) -> InterviewGraphState:
    request = state["request"]
    try:
        raw_decision = runtime.context.raw_decision
        if raw_decision is None:
            raise ValueError("Decision payload is missing.")
        payload = json.loads(strip_code_fence(raw_decision))
        if not isinstance(payload, dict):
            raise ValueError("Decision payload must be an object.")
        decision = NextInterviewResponse.model_validate(
            {"contractVersion": "interview-runtime.v1", **payload}
        )
        assert_allowed_sources(decision, request)
    except (ValueError, ValidationError, json.JSONDecodeError):
        log_graph_event(
            LOGGER,
            "interview_decision_invalid",
            {
                "code": "MODEL_PROVIDER_RESPONSE_INVALID",
                "attempt": state.get("attempt", 0),
                "trace_id": request.trace_id,
                "session_id": request.session.id,
            },
        )
        return failure_state(
            "MODEL_PROVIDER_RESPONSE_INVALID",
            retryable=False,
            attempt=state.get("attempt", 0),
        )
    return {"decision": decision, "failure_code": "", "retryable": False}


def failure(state: InterviewGraphState) -> InterviewGraphState:
    return state


def failure_state(code: str, *, retryable: bool, attempt: int) -> InterviewGraphState:
    return {"failure_code": code, "retryable": retryable, "attempt": attempt}


def gateway_failure_state(error: ModelGatewayError, attempt: int) -> InterviewGraphState:
    return {
        "failure_code": error.code,
        "retryable": error.retryable,
        "attempt": attempt,
        "retry_after_seconds": error.retry_after_seconds,
    }


def assert_allowed_sources(
    decision: NextInterviewResponse,
    request: NextInterviewRequest,
) -> None:
    if not decision.source_ids:
        return
    allowed = {source.source_id for source in request.retrieval_context or []}
    if any(source_id not in allowed for source_id in decision.source_ids):
        raise ValueError("Decision cited an unavailable retrieval source.")
