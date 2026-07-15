import {
  AdvanceInterviewInputSchema,
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
