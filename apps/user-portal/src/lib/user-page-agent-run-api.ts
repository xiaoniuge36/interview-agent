import {
  PageAgentRunSchema,
  PageAgentRunStatusSchema,
  type PageAgentRun,
} from '@interview-agent/contracts';
import {
  createPageAgentRunRequests,
  type PageAgentCompleteRunInput,
  type PageAgentCreateRunInput,
  type PageAgentHeartbeatRunInput,
} from '@interview-agent/page-agent-client';
import { apiRequest } from './api';

const runRequests = createPageAgentRunRequests('/user/page-agent');

export const UserAgentRunStatusSchema = PageAgentRunStatusSchema;
export const UserAgentRunSchema = PageAgentRunSchema;

export type UserAgentRun = PageAgentRun;
export type UserAgentHeartbeatRunInput = PageAgentHeartbeatRunInput;
export type UserAgentCompleteRunInput = PageAgentCompleteRunInput;
export type UserAgentCreateRunInput = PageAgentCreateRunInput;

export const createUserAgentLatestRunRequest = runRequests.latest;
export const createUserAgentRunHistoryRequest = runRequests.history;
export const createUserAgentRunRequest = runRequests.create;
export const createUserAgentHeartbeatRunRequest = runRequests.heartbeat;
export const createUserAgentCompleteRunRequest = runRequests.complete;

export function getUserAgentRunHistory(conversationId: string, signal?: AbortSignal) {
  return apiRequest({
    ...runRequests.history(conversationId),
    ...(signal ? { init: { signal } } : {}),
  });
}

export function createUserAgentRun(conversationId: string, input: UserAgentCreateRunInput) {
  return apiRequest(runRequests.create(conversationId, input));
}

export function heartbeatUserAgentRun(runId: string, input: UserAgentHeartbeatRunInput) {
  return apiRequest(runRequests.heartbeat(runId, input));
}

export function completeUserAgentRun(runId: string, input: UserAgentCompleteRunInput) {
  return apiRequest(runRequests.complete(runId, input));
}
