import json
from dataclasses import dataclass
from typing import Protocol, cast

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.runtime import Runtime
from pydantic import ValidationError
from typing_extensions import TypedDict

from app.model_gateway import ModelGatewayError, ModelGatewayRequest
from app.schemas.interview import NextInterviewRequest, NextInterviewResponse

MAX_GATEWAY_ATTEMPTS = 2


class ModelGateway(Protocol):
    async def complete(self, request: ModelGatewayRequest) -> str: ...


class InterviewGraphState(TypedDict, total=False):
    request: NextInterviewRequest
    decision: NextInterviewResponse
    attempt: int
    failure_code: str
    retryable: bool


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
) -> InterviewGraphRunner:
    graph: StateGraph[
        InterviewGraphState,
        InterviewGraphContext,
        InterviewGraphState,
        InterviewGraphState,
    ] = StateGraph(InterviewGraphState, context_schema=InterviewGraphContext)
    graph.add_node(
        "prepare_context",
        prepare_context,
    )  # type: ignore[call-overload]
    graph.add_node(
        "generate_decision",
        generate_decision_node(gateway),
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
    compiled = graph.compile(checkpointer=checkpointer or InMemorySaver())
    return cast(InterviewGraphRunner, compiled)


async def run_interview_graph(
    graph: InterviewGraphRunner,
    request: NextInterviewRequest,
) -> NextInterviewResponse:
    grant = request.model_invocation_grant
    if grant is None:
        raise InterviewGraphError("MODEL_INVOCATION_GRANT_REQUIRED")
    sanitized_request = request.model_copy(update={"model_invocation_grant": None})
    state = await graph.ainvoke(
        {"request": sanitized_request, "attempt": 0},
        {"configurable": {"thread_id": graph_thread_id(request)}},
        context=InterviewGraphContext(grant=grant),
    )
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
    return {"attempt": 0, "failure_code": "", "retryable": False}


def generate_decision_node(
    gateway: ModelGateway,
) -> GenerateDecisionNode:
    async def generate_decision(
        state: InterviewGraphState,
        *,
        runtime: Runtime[InterviewGraphContext],
    ) -> InterviewGraphState:
        request = state["request"]
        attempt = state.get("attempt", 0) + 1
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
            return failure_state(error.code, retryable=error.retryable, attempt=attempt)
        return {
            "attempt": attempt,
            "failure_code": "",
            "retryable": False,
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
    except (ValueError, ValidationError, json.JSONDecodeError):
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


def system_prompt(request: NextInterviewRequest) -> str:
    return "\n".join(
        [
            (
                "请先输出 content 字段；可选 basisSummary 最多三条，"
                "只能引用用户回答、岗位要求或评分标准中的可解释证据。"
            ),
            "你是专业的中文模拟面试官。基于候选人的最近回答推进面试。",
            "只返回 JSON，不要 Markdown，不要解释。",
            (
                'JSON 格式：{"stage":"当前或下一阶段","content":"给用户的问题或结束语",'
                '"shouldFinish":false}。'
            ),
            (
                "可用阶段：warmup, self_intro, tech_basics, jd_core, project_deep_dive, "
                "scenario_design, hr, final_evaluation。"
            ),
            (
                f"当前阶段：{request.session.stage}；"
                f"候选人已回答 {request.session.candidate_turn_count} 次。"
            ),
        ]
    )


def user_prompt(request: NextInterviewRequest) -> str:
    history = "\n".join(
        f"{'候选人' if turn.role == 'candidate' else '面试官'}：{turn.content}"
        for turn in request.session.recent_turns
    )
    parts = [f"面试主题：{request.session.title}"]
    parts.append(f"最近对话：\n{history}" if history else "这是面试开始，请提出第一题。")
    if request.answer:
        parts.append(f"本次回答：{request.answer}")
    return "\n\n".join(parts)


def strip_code_fence(value: str) -> str:
    stripped = value.strip()
    if stripped.startswith("```json"):
        stripped = stripped[len("```json") :].lstrip()
    elif stripped.startswith("```"):
        stripped = stripped[len("```") :].lstrip()
    if stripped.endswith("```"):
        stripped = stripped[: -len("```")].rstrip()
    return stripped
