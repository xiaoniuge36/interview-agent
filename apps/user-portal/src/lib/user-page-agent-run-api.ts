import { z } from 'zod';
import { apiRequest } from './api';

export const UserAgentRunStatusSchema = z.enum([
  'running',
  'waiting_confirmation',
  'succeeded',
  'failed',
  'cancelled',
  'interrupted',
]);
export const UserAgentRunSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  retryOfRunId: z.string().nullable(),
  prompt: z.string(),
  status: UserAgentRunStatusSchema,
  currentStep: z.string().nullable(),
  tokenCount: z.number().int().nonnegative(),
  traceId: z.string(),
  errorCode: z.string().nullable(),
  errorSummary: z.string().nullable(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  heartbeatAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserAgentRun = z.infer<typeof UserAgentRunSchema>;
export type UserAgentHeartbeatRunInput = {
  status: 'running' | 'waiting_confirmation';
  currentStep?: string;
  tokenCount?: number;
};
export type UserAgentCompleteRunInput = {
  status: 'succeeded' | 'failed' | 'cancelled';
  currentStep?: string;
  tokenCount?: number;
  errorCode?: string;
  errorSummary?: string;
};
export type UserAgentCreateRunInput = {
  prompt: string;
  clientRequestId: string;
  retryOfRunId?: string;
};

const conversationRunsPath = (conversationId: string) =>
  `/user/page-agent/conversations/${encodeURIComponent(conversationId)}/runs`;
const runPath = (runId: string) => `/user/page-agent/runs/${encodeURIComponent(runId)}`;

export function createUserAgentLatestRunRequest(conversationId: string) {
  return {
    path: `${conversationRunsPath(conversationId)}/latest`,
    schema: UserAgentRunSchema.nullable(),
  };
}

export function createUserAgentRunHistoryRequest(conversationId: string) {
  return { path: conversationRunsPath(conversationId), schema: UserAgentRunSchema.array() };
}

export function createUserAgentRunRequest(conversationId: string, input: UserAgentCreateRunInput) {
  return {
    path: conversationRunsPath(conversationId),
    schema: UserAgentRunSchema,
    init: { method: 'POST', body: JSON.stringify(input) },
  };
}

export function createUserAgentHeartbeatRunRequest(
  runId: string,
  input: UserAgentHeartbeatRunInput,
) {
  return {
    path: `${runPath(runId)}/heartbeat`,
    schema: UserAgentRunSchema,
    init: { method: 'PATCH', body: JSON.stringify(input) },
  };
}

export function createUserAgentCompleteRunRequest(runId: string, input: UserAgentCompleteRunInput) {
  return {
    path: `${runPath(runId)}/complete`,
    schema: UserAgentRunSchema,
    init: { method: 'POST', body: JSON.stringify(input) },
  };
}

export function getUserAgentRunHistory(conversationId: string, signal?: AbortSignal) {
  return apiRequest({
    ...createUserAgentRunHistoryRequest(conversationId),
    ...(signal ? { init: { signal } } : {}),
  });
}

export function createUserAgentRun(conversationId: string, input: UserAgentCreateRunInput) {
  return apiRequest(createUserAgentRunRequest(conversationId, input));
}

export function heartbeatUserAgentRun(runId: string, input: UserAgentHeartbeatRunInput) {
  return apiRequest(createUserAgentHeartbeatRunRequest(runId, input));
}

export function completeUserAgentRun(runId: string, input: UserAgentCompleteRunInput) {
  return apiRequest(createUserAgentCompleteRunRequest(runId, input));
}
