import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PageAgentConversationSchema,
  PageAgentConversationSummarySchema,
  PageAgentRunSchema,
} from './schemas/page-agent';

const RUN_FIXTURE = {
  id: 'run-1',
  conversationId: 'conversation-1',
  retryOfRunId: null,
  prompt: '总结当前页面',
  status: 'running',
  currentStep: '正在读取页面结构',
  tokenCount: 128,
  traceId: 'trace-1',
  errorCode: null,
  errorSummary: null,
  startedAt: '2026-08-25T08:00:00.000Z',
  finishedAt: null,
  heartbeatAt: '2026-08-25T08:00:15.000Z',
  updatedAt: '2026-08-25T08:00:15.000Z',
};

test('page agent run keeps the wire shape shared by both frontends', () => {
  const run = PageAgentRunSchema.parse(RUN_FIXTURE);
  assert.equal(run.status, 'running');
  assert.equal(run.tokenCount, 128);
  assert.equal(PageAgentRunSchema.safeParse({ ...RUN_FIXTURE, status: 'paused' }).success, false);
  assert.equal(PageAgentRunSchema.safeParse({ ...RUN_FIXTURE, tokenCount: -1 }).success, false);
});

test('page agent conversation extends the summary with ordered messages', () => {
  const summary = PageAgentConversationSummarySchema.parse({
    id: 'conversation-1',
    title: '页面助手对话',
    messageCount: 1,
    lastMessagePreview: '好的，已完成。',
    createdAt: '2026-08-25T08:00:00.000Z',
    updatedAt: '2026-08-25T08:01:00.000Z',
  });
  const conversation = PageAgentConversationSchema.parse({
    ...summary,
    messages: [
      {
        id: 'message-1',
        role: 'assistant',
        content: '好的，已完成。',
        tokenCount: null,
        createdAt: '2026-08-25T08:01:00.000Z',
      },
    ],
  });
  assert.equal(conversation.messages[0]?.role, 'assistant');
  assert.equal(
    PageAgentConversationSchema.safeParse({ ...summary, messages: [{ role: 'system' }] }).success,
    false,
  );
});
