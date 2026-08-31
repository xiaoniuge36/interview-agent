import {
  PracticeReportRuntimeEvaluationSchema,
  PracticeReportRuntimeMemoryEventSchema,
  PracticeReportRuntimeRequestSchema,
  PracticeReportRuntimeResponseSchema,
} from '../src/schemas/report';
import {
  GENERATED_HEADER,
  arrayBounds,
  assertShapes,
  fieldOptions,
  numberField,
  optionalField,
  render,
  stringBounds,
  type RuntimeMetadata,
  type ShapeExpectation,
} from './runtime-schema-shared';

const PRACTICE_REPORT_TEMPLATE = `{{HEADER}}
from typing import Literal

from pydantic import Field

from app.schemas.interview import ContractModel, RuntimeRetrievalContext

ContractVersion = Literal[{{PRACTICE_CONTRACT_VERSION}}]


class PracticeReportSession(ContractModel):
    id: str = {{PR_SESSION_ID}}
    tenant_id: str = {{PR_SESSION_TENANT_ID}}
    user_id: str = {{PR_SESSION_USER_ID}}
    title: str = {{PR_SESSION_TITLE}}


class PracticeReportEvaluation(ContractModel):
    item_id: str = {{PR_EVAL_ITEM_ID}}
    question_id: str = {{PR_EVAL_QUESTION_ID}}
    question_title: str = {{PR_EVAL_QUESTION_TITLE}}
    question_tags: list[str] = {{PR_EVAL_QUESTION_TAGS}}
    score: float = {{PR_EVAL_SCORE}}
    feedback: str = {{PR_EVAL_FEEDBACK}}
    missing_points: list[str] = {{PR_EVAL_MISSING_POINTS}}


class PracticeReportRequest(ContractModel):
    contract_version: ContractVersion
    session: PracticeReportSession
    evaluations: list[PracticeReportEvaluation] = {{PR_REQUEST_EVALUATIONS}}
    retrieval_context: list[RuntimeRetrievalContext] | None = {{PR_REQUEST_RETRIEVAL_CONTEXT}}
    command_id: str = {{PR_REQUEST_COMMAND_ID}}
    trace_id: str = {{PR_REQUEST_TRACE_ID}}
    model_invocation_grant: str | None = {{PR_REQUEST_GRANT}}


class PracticeReportMemoryEvent(ContractModel):
    tag: str = {{PR_MEMORY_TAG}}
    observed_score: float = {{PR_MEMORY_OBSERVED_SCORE}}
    evidence: str = {{PR_MEMORY_EVIDENCE}}


# Runtime-internal LLM decision payload (a subset of the response); not part of the HTTP contract.
class PracticeReportDecision(ContractModel):
    summary: str = {{PR_SUMMARY}}
    strengths: list[str] = {{PR_STRENGTHS}}
    weaknesses: list[str] = {{PR_WEAKNESSES}}
    next_actions: list[str] = {{PR_NEXT_ACTIONS}}
    report_markdown: str = {{PR_REPORT_MARKDOWN}}
    source_ids: list[str] = {{PR_SOURCE_IDS}}


class PracticeReportResponse(ContractModel):
    contract_version: ContractVersion = {{PRACTICE_CONTRACT_VERSION}}
    overall_score: float = {{PR_OVERALL_SCORE}}
    summary: str = {{PR_SUMMARY}}
    strengths: list[str] = {{PR_STRENGTHS}}
    weaknesses: list[str] = {{PR_WEAKNESSES}}
    next_actions: list[str] = {{PR_NEXT_ACTIONS}}
    report_markdown: str = {{PR_REPORT_MARKDOWN}}
    source_ids: list[str] = {{PR_SOURCE_IDS}}
    memory_events: list[PracticeReportMemoryEvent] = {{PR_MEMORY_EVENTS}}
    fallback_used: bool
`;

const PRACTICE_REPORT_SHAPES: ShapeExpectation[] = [
  {
    name: 'practiceSession',
    actual: () => Object.keys(PracticeReportRuntimeRequestSchema.shape.session.shape),
    expected: ['id', 'tenantId', 'userId', 'title'],
  },
  {
    name: 'practiceEvaluation',
    actual: () => Object.keys(PracticeReportRuntimeEvaluationSchema.shape),
    expected: [
      'itemId',
      'questionId',
      'questionTitle',
      'questionTags',
      'score',
      'feedback',
      'missingPoints',
    ],
  },
  {
    name: 'practiceRequest',
    actual: () => Object.keys(PracticeReportRuntimeRequestSchema.shape),
    expected: [
      'contractVersion',
      'session',
      'evaluations',
      'retrievalContext',
      'commandId',
      'traceId',
      'modelInvocationGrant',
    ],
  },
  {
    name: 'practiceMemoryEvent',
    actual: () => Object.keys(PracticeReportRuntimeMemoryEventSchema.shape),
    expected: ['tag', 'observedScore', 'evidence'],
  },
  {
    name: 'practiceResponse',
    actual: () => Object.keys(PracticeReportRuntimeResponseSchema.shape),
    expected: [
      'contractVersion',
      'overallScore',
      'summary',
      'strengths',
      'weaknesses',
      'nextActions',
      'reportMarkdown',
      'sourceIds',
      'memoryEvents',
      'fallbackUsed',
    ],
  },
];

function practiceReportMetadata(): RuntimeMetadata {
  const requestShape = PracticeReportRuntimeRequestSchema.shape;
  const sessionShape = requestShape.session.shape;
  const evaluationShape = PracticeReportRuntimeEvaluationSchema.shape;
  const memoryShape = PracticeReportRuntimeMemoryEventSchema.shape;
  const responseShape = PracticeReportRuntimeResponseSchema.shape;
  const version = JSON.stringify(requestShape.contractVersion.value);
  return {
    HEADER: GENERATED_HEADER,
    PRACTICE_CONTRACT_VERSION: version,
    PR_SESSION_ID: fieldOptions(stringBounds(sessionShape.id)),
    PR_SESSION_TENANT_ID: fieldOptions(stringBounds(sessionShape.tenantId)),
    PR_SESSION_USER_ID: fieldOptions(stringBounds(sessionShape.userId)),
    PR_SESSION_TITLE: fieldOptions(stringBounds(sessionShape.title)),
    PR_EVAL_ITEM_ID: fieldOptions(stringBounds(evaluationShape.itemId)),
    PR_EVAL_QUESTION_ID: fieldOptions(stringBounds(evaluationShape.questionId)),
    PR_EVAL_QUESTION_TITLE: fieldOptions(stringBounds(evaluationShape.questionTitle)),
    PR_EVAL_QUESTION_TAGS: fieldOptions(arrayBounds(evaluationShape.questionTags)),
    PR_EVAL_SCORE: numberField(stringBounds(evaluationShape.score)),
    PR_EVAL_FEEDBACK: fieldOptions(stringBounds(evaluationShape.feedback)),
    PR_EVAL_MISSING_POINTS: fieldOptions(arrayBounds(evaluationShape.missingPoints)),
    PR_REQUEST_EVALUATIONS: fieldOptions(arrayBounds(requestShape.evaluations)),
    PR_REQUEST_RETRIEVAL_CONTEXT: optionalField(arrayBounds(requestShape.retrievalContext)),
    PR_REQUEST_COMMAND_ID: fieldOptions(stringBounds(requestShape.commandId)),
    PR_REQUEST_TRACE_ID: fieldOptions(stringBounds(requestShape.traceId)),
    PR_REQUEST_GRANT: optionalField(stringBounds(requestShape.modelInvocationGrant)),
    PR_MEMORY_TAG: fieldOptions(stringBounds(memoryShape.tag)),
    PR_MEMORY_OBSERVED_SCORE: numberField(stringBounds(memoryShape.observedScore)),
    PR_MEMORY_EVIDENCE: fieldOptions(stringBounds(memoryShape.evidence)),
    PR_OVERALL_SCORE: numberField(stringBounds(responseShape.overallScore)),
    PR_SUMMARY: fieldOptions(stringBounds(responseShape.summary)),
    PR_STRENGTHS: fieldOptions(arrayBounds(responseShape.strengths)),
    PR_WEAKNESSES: fieldOptions(arrayBounds(responseShape.weaknesses)),
    PR_NEXT_ACTIONS: fieldOptions(arrayBounds(responseShape.nextActions)),
    PR_REPORT_MARKDOWN: fieldOptions(stringBounds(responseShape.reportMarkdown)),
    PR_SOURCE_IDS: fieldOptions(arrayBounds(responseShape.sourceIds)),
    PR_MEMORY_EVENTS: fieldOptions(arrayBounds(responseShape.memoryEvents)),
  };
}

export function generatePracticeReportSchema(): string {
  assertShapes(PRACTICE_REPORT_SHAPES);
  return render(PRACTICE_REPORT_TEMPLATE, practiceReportMetadata());
}
