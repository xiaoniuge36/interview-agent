from typing import Literal

from pydantic import Field

from app.schemas.interview import ContractModel, RuntimeRetrievalContext

ContractVersion = Literal["practice-report-runtime.v1"]


class PracticeReportSession(ContractModel):
    id: str = Field(min_length=1, max_length=200)
    tenant_id: str = Field(min_length=1, max_length=200)
    user_id: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=200)


class PracticeReportEvaluation(ContractModel):
    item_id: str = Field(min_length=1, max_length=200)
    question_id: str = Field(min_length=1, max_length=200)
    question_title: str = Field(min_length=1, max_length=200)
    question_tags: list[str] = Field(max_length=20)
    score: float = Field(ge=0, le=100)
    feedback: str = Field(min_length=1, max_length=2000)
    missing_points: list[str] = Field(max_length=20)


class PracticeReportRequest(ContractModel):
    contract_version: ContractVersion
    session: PracticeReportSession
    evaluations: list[PracticeReportEvaluation] = Field(min_length=1, max_length=10)
    retrieval_context: list[RuntimeRetrievalContext] | None = Field(default=None, max_length=6)
    command_id: str = Field(min_length=1, max_length=200)
    trace_id: str = Field(min_length=8, max_length=128)
    model_invocation_grant: str | None = Field(default=None, min_length=16, max_length=4096)


class PracticeReportMemoryEvent(ContractModel):
    tag: str = Field(min_length=1, max_length=200)
    observed_score: float = Field(ge=0, le=100)
    evidence: str = Field(min_length=1, max_length=2000)


class PracticeReportDecision(ContractModel):
    summary: str = Field(min_length=1, max_length=2000)
    strengths: list[str] = Field(max_length=20)
    weaknesses: list[str] = Field(max_length=20)
    next_actions: list[str] = Field(max_length=20)
    report_markdown: str = Field(min_length=1, max_length=20_000)
    source_ids: list[str] = Field(max_length=6)


class PracticeReportResponse(ContractModel):
    contract_version: ContractVersion = "practice-report-runtime.v1"
    overall_score: float = Field(ge=0, le=100)
    summary: str = Field(min_length=1, max_length=2000)
    strengths: list[str] = Field(max_length=20)
    weaknesses: list[str] = Field(max_length=20)
    next_actions: list[str] = Field(max_length=20)
    report_markdown: str = Field(min_length=1, max_length=20_000)
    source_ids: list[str] = Field(max_length=6)
    memory_events: list[PracticeReportMemoryEvent] = Field(max_length=20)
    fallback_used: bool
