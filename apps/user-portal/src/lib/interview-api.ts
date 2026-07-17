import {
  AdvanceInterviewInputSchema,
  type AiOperationStreamEvent,
  InterviewCommandResultSchema,
  InterviewListSchema,
  InterviewReportSchema,
  InterviewSessionSchema,
  StartInterviewInputSchema,
  SubmitInterviewAnswerInputSchema,
  type AdvanceInterviewInput,
  type InterviewCommandResult,
  type InterviewReport,
  type InterviewSession,
  type StartInterviewInput,
  type SubmitInterviewAnswerInput,
} from '@interview-agent/contracts';
import { apiRequest, createIdempotencyKey } from './api';
import { ApiError } from './api';
import { runAiOperationStream } from './ai-operation-stream';

export function listInterviews(): Promise<InterviewSession[]> {
  return apiRequest({
    path: '/interviews',
    schema: InterviewListSchema,
  });
}

export function startInterview(input: StartInterviewInput): Promise<InterviewCommandResult> {
  return commandRequest('/interviews/start', StartInterviewInputSchema.parse(input), 'start');
}

export function advanceInterview(
  sessionId: string,
  input: AdvanceInterviewInput,
): Promise<InterviewCommandResult> {
  const path = '/interviews/' + sessionId + '/advance';
  return commandRequest(path, AdvanceInterviewInputSchema.parse(input), 'advance');
}

export function answerInterview(
  sessionId: string,
  input: SubmitInterviewAnswerInput,
): Promise<InterviewCommandResult> {
  const path = '/interviews/' + sessionId + '/answer';
  return commandRequest(path, SubmitInterviewAnswerInputSchema.parse(input), 'answer');
}

export async function advanceInterviewStream(
  sessionId: string,
  input: AdvanceInterviewInput,
  options: {
    signal?: AbortSignal;
    onEvent?: (event: AiOperationStreamEvent) => void;
  } = {},
): Promise<InterviewNextStreamResult> {
  return requestInterviewStream({
    path: `/interviews/${sessionId}/advance/stream`,
    input: AdvanceInterviewInputSchema.parse(input),
    idempotencyScope: 'interview-advance',
    options,
  });
}

export async function answerInterviewStream(
  sessionId: string,
  input: SubmitInterviewAnswerInput,
  options: {
    signal?: AbortSignal;
    onEvent?: (event: AiOperationStreamEvent) => void;
  } = {},
): Promise<InterviewNextStreamResult> {
  return requestInterviewStream({
    path: `/interviews/${sessionId}/answer/stream`,
    input: SubmitInterviewAnswerInputSchema.parse(input),
    idempotencyScope: 'interview-answer',
    options,
  });
}

export type InterviewNextStreamResult = {
  result: InterviewCommandResult;
  basisSummary: string[];
};

export function getInterview(sessionId: string): Promise<InterviewSession> {
  return apiRequest({
    path: '/interviews/' + sessionId,
    schema: InterviewSessionSchema,
  });
}

export function getInterviewReport(sessionId: string): Promise<InterviewReport> {
  return apiRequest({
    path: '/interviews/' + sessionId + '/report',
    schema: InterviewReportSchema,
  });
}

function commandRequest(
  path: string,
  input: object,
  idempotencyScope: string,
): Promise<InterviewCommandResult> {
  return apiRequest({
    path,
    schema: InterviewCommandResultSchema,
    init: {
      method: 'POST',
      headers: { 'Idempotency-Key': createIdempotencyKey(idempotencyScope) },
      body: JSON.stringify(input),
    },
  });
}

async function requestInterviewStream(request: {
  path: string;
  input: object;
  idempotencyScope: string;
  options: {
    signal?: AbortSignal;
    onEvent?: (event: AiOperationStreamEvent) => void;
  };
}): Promise<InterviewNextStreamResult> {
  const event = await runAiOperationStream({
    path: request.path,
    body: request.input,
    idempotencyKey: createIdempotencyKey(request.idempotencyScope),
    ...(request.options.signal ? { signal: request.options.signal } : {}),
    ...(request.options.onEvent ? { onEvent: request.options.onEvent } : {}),
  });
  if (event.operation === 'interview_next') {
    return { result: event.result, basisSummary: event.basisSummary };
  }
  throw new ApiError({ code: 'INVALID_STREAM_RESULT', message: '模拟面试返回的数据不符合预期。' });
}
