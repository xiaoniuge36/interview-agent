import {
  AgentRuntimeContractVersionSchema,
  AgentRuntimeNextRequestSchema,
  AgentRuntimeNextResponseSchema,
  AgentRuntimeRetrievalContextSchema,
  AgentRuntimeSessionContextSchema,
  AgentRuntimeTurnContextSchema,
  InterviewSessionStatusSchema,
  InterviewStageSchema,
  InterviewTurnRoleSchema,
} from '../src/schemas/interview';
import {
  GENERATED_HEADER,
  arrayMaximum,
  assertShapes,
  fieldOptions,
  optionalField,
  pythonLiteral,
  render,
  stringBounds,
  type RuntimeMetadata,
  type ShapeExpectation,
} from './runtime-schema-shared';

const INTERVIEW_TEMPLATE = `{{HEADER}}
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

InterviewStage = {{INTERVIEW_STAGE}}
InterviewStatus = {{INTERVIEW_STATUS}}
InterviewTurnRole = {{TURN_ROLE}}
ContractVersion = Literal[{{CONTRACT_VERSION}}]


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
    content: str = {{TURN_CONTENT}}


class RuntimeRetrievalContext(ContractModel):
    source_id: str = {{RETRIEVAL_SOURCE_ID}}
    entity_type: str = {{RETRIEVAL_ENTITY_TYPE}}
    content: str = {{RETRIEVAL_CONTENT}}


class RuntimeSessionContext(ContractModel):
    id: str = Field(min_length=1)
    tenant_id: str = Field(min_length=1)
    user_id: str = Field(min_length=1)
    status: InterviewStatus
    stage: InterviewStage
    version: int = Field(ge=0)
    title: str = {{TITLE}}
    candidate_turn_count: int = Field(ge=0)
    recent_turns: list[RuntimeTurnContext] = Field(max_length={{RECENT_TURNS_MAXIMUM}})


class NextInterviewRequest(ContractModel):
    contract_version: ContractVersion
    session: RuntimeSessionContext
    command_id: str = {{COMMAND_ID}}
    trace_id: str = {{TRACE_ID}}
    answer: str | None = {{ANSWER}}
    retrieval_context: list[RuntimeRetrievalContext] | None = Field(default=None, max_length={{RETRIEVAL_CONTEXT_MAXIMUM}})
    model_invocation_grant: str | None = {{MODEL_INVOCATION_GRANT}}


class NextInterviewResponse(ContractModel):
    contract_version: ContractVersion = {{CONTRACT_VERSION}}
    stage: InterviewStage
    content: str = {{RESPONSE_CONTENT}}
    should_finish: bool
    basis_summary: list[str] | None = Field(default=None, max_length={{BASIS_SUMMARY_MAXIMUM}})
    source_ids: list[str] | None = Field(default=None, max_length={{SOURCE_IDS_MAXIMUM}})
`;

const INTERVIEW_SHAPES: ShapeExpectation[] = [
  {
    name: 'turn',
    actual: () => Object.keys(AgentRuntimeTurnContextSchema.shape),
    expected: ['role', 'stage', 'content'],
  },
  {
    name: 'session',
    actual: () => Object.keys(AgentRuntimeSessionContextSchema.shape),
    expected: [
      'id',
      'tenantId',
      'userId',
      'status',
      'stage',
      'version',
      'title',
      'candidateTurnCount',
      'recentTurns',
    ],
  },
  {
    name: 'retrieval',
    actual: () => Object.keys(AgentRuntimeRetrievalContextSchema.shape),
    expected: ['sourceId', 'entityType', 'content'],
  },
  {
    name: 'request',
    actual: () => Object.keys(AgentRuntimeNextRequestSchema.shape),
    expected: [
      'contractVersion',
      'session',
      'commandId',
      'traceId',
      'answer',
      'retrievalContext',
      'modelInvocationGrant',
    ],
  },
  {
    name: 'response',
    actual: () => Object.keys(AgentRuntimeNextResponseSchema.shape),
    expected: ['contractVersion', 'stage', 'content', 'shouldFinish', 'basisSummary', 'sourceIds'],
  },
];

function interviewMetadata(): RuntimeMetadata {
  const turnShape = AgentRuntimeTurnContextSchema.shape;
  const sessionShape = AgentRuntimeSessionContextSchema.shape;
  const retrievalShape = AgentRuntimeRetrievalContextSchema.shape;
  const requestShape = AgentRuntimeNextRequestSchema.shape;
  const responseShape = AgentRuntimeNextResponseSchema.shape;
  const version = JSON.stringify(AgentRuntimeContractVersionSchema.value);
  return {
    HEADER: GENERATED_HEADER,
    INTERVIEW_STAGE: pythonLiteral(InterviewStageSchema.options),
    INTERVIEW_STATUS: pythonLiteral(InterviewSessionStatusSchema.options),
    TURN_ROLE: pythonLiteral(InterviewTurnRoleSchema.options),
    CONTRACT_VERSION: version,
    TURN_CONTENT: fieldOptions(stringBounds(turnShape.content)),
    TITLE: fieldOptions(stringBounds(sessionShape.title)),
    RECENT_TURNS_MAXIMUM: String(arrayMaximum(sessionShape.recentTurns)),
    COMMAND_ID: fieldOptions(stringBounds(requestShape.commandId)),
    TRACE_ID: fieldOptions(stringBounds(requestShape.traceId)),
    ANSWER: optionalField(stringBounds(requestShape.answer)),
    RETRIEVAL_SOURCE_ID: fieldOptions(stringBounds(retrievalShape.sourceId)),
    RETRIEVAL_ENTITY_TYPE: fieldOptions(stringBounds(retrievalShape.entityType)),
    RETRIEVAL_CONTENT: fieldOptions(stringBounds(retrievalShape.content)),
    RETRIEVAL_CONTEXT_MAXIMUM: String(arrayMaximum(requestShape.retrievalContext)),
    MODEL_INVOCATION_GRANT: optionalField(stringBounds(requestShape.modelInvocationGrant)),
    RESPONSE_CONTENT: fieldOptions(stringBounds(responseShape.content)),
    BASIS_SUMMARY_MAXIMUM: String(arrayMaximum(responseShape.basisSummary)),
    SOURCE_IDS_MAXIMUM: String(arrayMaximum(responseShape.sourceIds)),
  };
}

export function generateInterviewSchema(): string {
  assertShapes(INTERVIEW_SHAPES);
  return render(INTERVIEW_TEMPLATE, interviewMetadata());
}
