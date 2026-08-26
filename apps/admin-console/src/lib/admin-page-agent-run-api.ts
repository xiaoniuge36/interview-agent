import {
  PageAgentRunSchema,
  PageAgentRunStatusSchema,
  type PageAgentRun,
  type PageAgentRunStatus,
} from '@interview-agent/contracts';
import {
  createPageAgentRunRequests,
  type PageAgentCompleteRunInput,
  type PageAgentCreateRunInput,
  type PageAgentHeartbeatRunInput,
} from '@interview-agent/page-agent-client';
import { adminRequest } from './api';

const runRequests = createPageAgentRunRequests('/admin/page-agent');

export const AdminAgentRunStatusSchema = PageAgentRunStatusSchema;
export const AdminAgentRunSchema = PageAgentRunSchema;

export type AdminAgentRun = PageAgentRun;
export type AdminAgentRunStatus = PageAgentRunStatus;
export type AdminAgentCreateRunInput = PageAgentCreateRunInput;
export type AdminAgentHeartbeatRunInput = PageAgentHeartbeatRunInput;
export type AdminAgentCompleteRunInput = PageAgentCompleteRunInput;

export const createAdminAgentLatestRunRequest = runRequests.latest;
export const createAdminAgentRunHistoryRequest = runRequests.history;
export const createCreateAdminAgentRunRequest = runRequests.create;
export const createAdminAgentHeartbeatRunRequest = runRequests.heartbeat;
export const createAdminAgentCompleteRunRequest = runRequests.complete;

export function getLatestAdminAgentRun(conversationId: string, signal?: AbortSignal) {
  return adminRequest({
    ...runRequests.latest(conversationId),
    ...(signal ? { init: { signal } } : {}),
  });
}

export function getAdminAgentRunHistory(conversationId: string, signal?: AbortSignal) {
  return adminRequest({
    ...runRequests.history(conversationId),
    ...(signal ? { init: { signal } } : {}),
  });
}

export function createAdminAgentRun(conversationId: string, input: AdminAgentCreateRunInput) {
  return adminRequest(runRequests.create(conversationId, input));
}

export function heartbeatAdminAgentRun(runId: string, input: AdminAgentHeartbeatRunInput) {
  return adminRequest(runRequests.heartbeat(runId, input));
}

export function completeAdminAgentRun(runId: string, input: AdminAgentCompleteRunInput) {
  return adminRequest(runRequests.complete(runId, input));
}
