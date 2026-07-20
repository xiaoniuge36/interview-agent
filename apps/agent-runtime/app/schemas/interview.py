# Generated from packages/contracts Zod schemas. Do not edit by hand.
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

InterviewStage = Literal[
    "warmup",
    "self_intro",
    "tech_basics",
    "jd_core",
    "project_deep_dive",
    "scenario_design",
    "hr",
    "final_evaluation",
    "report_ready",
    "memory_updated",
]
InterviewStatus = Literal[
    "created",
    "running",
    "waiting_user",
    "generating_report",
    "report_ready",
    "failed",
    "cancelled",
]
InterviewTurnRole = Literal[
    "interviewer",
    "candidate",
    "system",
]
ContractVersion = Literal["interview-runtime.v1"]


class ContractModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        populate_by_name=True,
        serialize_by_alias=True,
        str_strip_whitespace=True,
    )


class RuntimeTurnContext(ContractModel):
    role: InterviewTurnRole
    stage: InterviewStage
    content: str = Field(min_length=1, max_length=4000)


class RuntimeSessionContext(ContractModel):
    id: str = Field(min_length=1)
    tenant_id: str = Field(min_length=1)
    user_id: str = Field(min_length=1)
    status: InterviewStatus
    stage: InterviewStage
    version: int = Field(ge=0)
    title: str = Field(min_length=1, max_length=200)
    candidate_turn_count: int = Field(ge=0)
    recent_turns: list[RuntimeTurnContext] = Field(max_length=12)


class NextInterviewRequest(ContractModel):
    contract_version: ContractVersion
    session: RuntimeSessionContext
    command_id: str = Field(min_length=1, max_length=200)
    trace_id: str = Field(min_length=8, max_length=128)
    answer: str | None = Field(default=None, min_length=1, max_length=20000)
    model_invocation_grant: str | None = Field(default=None, min_length=16, max_length=4096)


class NextInterviewResponse(ContractModel):
    contract_version: ContractVersion = "interview-runtime.v1"
    stage: InterviewStage
    content: str = Field(min_length=1, max_length=20000)
    should_finish: bool
    basis_summary: list[str] | None = Field(default=None, max_length=3)
