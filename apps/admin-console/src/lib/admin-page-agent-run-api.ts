import { z } from 'zod';
import { adminRequest } from './api';

export const AdminAgentRunStatusSchema = z.enum([
  'running',
  'waiting_confirmation',
  'succeeded',
  'failed',
  'cancelled',
  'interrupted',
]);

export const AdminAgentRunSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  retryOfRunId: z.string().nullable(),
  prompt: z.string(),
  status: AdminAgentRunStatusSchema,
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

export type AdminAgentRun = z.infer<typeof AdminAgentRunSchema>;
export type AdminAgentRunStatus = z.infer<typeof AdminAgentRunStatusSchema>;
export type AdminAgentCreateRunInput = {
  prompt: string;
  clientRequestId: string;
  retryOfRunId?: string;
};
export type AdminAgentHeartbeatRunInput = {
  status: 'running' | 'waiting_confirmation';
  currentStep?: string;
  tokenCount?: number;
};
export type AdminAgentCompleteRunInput = {
  status: 'succeeded' | 'failed' | 'cancelled';
  currentStep?: string;
  tokenCount?: number;
  errorCode?: string;
  errorSummary?: string;
};

const conversationRunsPath = (conversationId: string) =>
  `/admin/page-agent/conversations/${encodeURIComponent(conversationId)}/runs`;
const runPath = (runId: string) => `/admin/page-agent/runs/${encodeURIComponent(runId)}`;

export function createAdminAgentLatestRunRequest(conversationId: string) {
  return {
    path: `${conversationRunsPath(conversationId)}/latest`,
    schema: AdminAgentRunSchema.nullable(),
  };
}

export function createAdminAgentRunHistoryRequest(conversationId: string) {
  return {
    path: conversationRunsPath(conversationId),
    schema: AdminAgentRunSchema.array(),
  };
}

export function createCreateAdminAgentRunRequest(
  conversationId: string,
  input: AdminAgentCreateRunInput,
) {
  return {
    path: conversationRunsPath(conversationId),
    schema: AdminAgentRunSchema,
    init: { method: 'POST', body: JSON.stringify(input) },
  };
}

export function createAdminAgentHeartbeatRunRequest(
  runId: string,
  input: AdminAgentHeartbeatRunInput,
) {
  return {
    path: `${runPath(runId)}/heartbeat`,
    schema: AdminAgentRunSchema,
    init: { method: 'PATCH', body: JSON.stringify(input) },
  };
}

export function createAdminAgentCompleteRunRequest(
  runId: string,
  input: AdminAgentCompleteRunInput,
) {
  return {
    path: `${runPath(runId)}/complete`,
    schema: AdminAgentRunSchema,
    init: { method: 'POST', body: JSON.stringify(input) },
  };
}

export function getLatestAdminAgentRun(conversationId: string, signal?: AbortSignal) {
  return adminRequest({
    ...createAdminAgentLatestRunRequest(conversationId),
    ...(signal ? { init: { signal } } : {}),
  });
}

export function getAdminAgentRunHistory(conversationId: string, signal?: AbortSignal) {
  return adminRequest({
    ...createAdminAgentRunHistoryRequest(conversationId),
    ...(signal ? { init: { signal } } : {}),
  });
}

export function createAdminAgentRun(conversationId: string, input: AdminAgentCreateRunInput) {
  return adminRequest(createCreateAdminAgentRunRequest(conversationId, input));
}

export function heartbeatAdminAgentRun(runId: string, input: AdminAgentHeartbeatRunInput) {
  return adminRequest(createAdminAgentHeartbeatRunRequest(runId, input));
}

export function completeAdminAgentRun(runId: string, input: AdminAgentCompleteRunInput) {
  return adminRequest(createAdminAgentCompleteRunRequest(runId, input));
}
