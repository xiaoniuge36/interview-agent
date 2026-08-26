import {
  PageAgentConversationListSchema,
  PageAgentConversationSchema,
  PageAgentConversationSummarySchema,
  PageAgentRunSchema,
  type PageAgentMessageRole,
} from '@interview-agent/contracts';
import { z } from 'zod';

export type PageAgentCreateRunInput = {
  prompt: string;
  clientRequestId: string;
  retryOfRunId?: string;
};

export type PageAgentHeartbeatRunInput = {
  status: 'running' | 'waiting_confirmation';
  currentStep?: string;
  tokenCount?: number;
};

export type PageAgentCompleteRunInput = {
  status: 'succeeded' | 'failed' | 'cancelled';
  currentStep?: string;
  tokenCount?: number;
  errorCode?: string;
  errorSummary?: string;
};

export type PageAgentMessageInput = {
  role: PageAgentMessageRole;
  content: string;
  tokenCount?: number;
};

/** 会话资源请求工厂：user/admin 仅 basePath（如 /user/page-agent）不同。 */
export function createPageAgentConversationRequests(basePath: string) {
  const collectionPath = `${basePath}/conversations`;
  const itemPath = (conversationId: string) =>
    `${collectionPath}/${encodeURIComponent(conversationId)}`;
  return {
    list: () => ({ path: collectionPath, schema: PageAgentConversationListSchema }),
    get: (conversationId: string) => ({
      path: itemPath(conversationId),
      schema: PageAgentConversationSchema,
    }),
    create: (title?: string) => ({
      path: collectionPath,
      schema: PageAgentConversationSummarySchema,
      init: { method: 'POST', body: JSON.stringify(title ? { title } : {}) },
    }),
    rename: (conversationId: string, title: string) => ({
      path: itemPath(conversationId),
      schema: PageAgentConversationSummarySchema,
      init: { method: 'PATCH', body: JSON.stringify({ title }) },
    }),
    remove: (conversationId: string) => ({
      path: itemPath(conversationId),
      schema: z.null(),
      init: { method: 'DELETE' },
    }),
    appendMessages: (conversationId: string, messages: PageAgentMessageInput[]) => ({
      path: `${itemPath(conversationId)}/messages`,
      schema: PageAgentConversationSchema,
      init: { method: 'POST', body: JSON.stringify({ messages }) },
    }),
  };
}

/** 运行记录请求工厂：latest/history/create/heartbeat/complete。 */
export function createPageAgentRunRequests(basePath: string) {
  const conversationRunsPath = (conversationId: string) =>
    `${basePath}/conversations/${encodeURIComponent(conversationId)}/runs`;
  const runPath = (runId: string) => `${basePath}/runs/${encodeURIComponent(runId)}`;
  return {
    latest: (conversationId: string) => ({
      path: `${conversationRunsPath(conversationId)}/latest`,
      schema: PageAgentRunSchema.nullable(),
    }),
    history: (conversationId: string) => ({
      path: conversationRunsPath(conversationId),
      schema: PageAgentRunSchema.array(),
    }),
    create: (conversationId: string, input: PageAgentCreateRunInput) => ({
      path: conversationRunsPath(conversationId),
      schema: PageAgentRunSchema,
      init: { method: 'POST', body: JSON.stringify(input) },
    }),
    heartbeat: (runId: string, input: PageAgentHeartbeatRunInput) => ({
      path: `${runPath(runId)}/heartbeat`,
      schema: PageAgentRunSchema,
      init: { method: 'PATCH', body: JSON.stringify(input) },
    }),
    complete: (runId: string, input: PageAgentCompleteRunInput) => ({
      path: `${runPath(runId)}/complete`,
      schema: PageAgentRunSchema,
      init: { method: 'POST', body: JSON.stringify(input) },
    }),
  };
}
