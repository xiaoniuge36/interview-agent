import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentRunDetailViewSchema } from './admin-runtime';

test('agent run details expose the user, tenant, session, model, and token usage', () => {
  const parsed = AgentRunDetailViewSchema.parse(agentRunDetail());

  assert.deepEqual(parsed.user, {
    id: 'user-1',
    name: 'Niu',
    email: 'niu@example.com',
  });
  assert.deepEqual(parsed.modelUsage, {
    provider: 'openai_compatible',
    model: 'zai-org/GLM-5.2',
    invocationCount: 2,
    inputTokens: 900,
    outputTokens: 334,
    cacheReadTokens: 120,
    reasoningTokens: 80,
    totalTokens: 1234,
    latencyMs: 8400,
  });
});

test('agent run details keep historical model usage explicitly unavailable', () => {
  const parsed = AgentRunDetailViewSchema.parse({
    ...agentRunDetail(),
    modelUsage: null,
  });

  assert.equal(parsed.modelUsage, null);
});

function agentRunDetail() {
  return {
    id: 'run-1',
    sessionId: 'session-1',
    type: 'mock_interview',
    status: 'succeeded',
    stage: 'tech_basics',
    traceId: 'trace-12345678',
    latencyMs: 9126,
    schemaValid: true,
    fallbackUsed: false,
    attemptCount: 1,
    updatedAt: '2026-07-17T07:31:04.321Z',
    tenant: { id: 'tenant-1', name: 'Niu 的个人空间' },
    user: { id: 'user-1', name: 'Niu', email: 'niu@example.com' },
    sessionTitle: '全栈开发工程师面试训练',
    command: 'answer',
    modelUsage: {
      provider: 'openai_compatible',
      model: 'zai-org/GLM-5.2',
      invocationCount: 2,
      inputTokens: 900,
      outputTokens: 334,
      cacheReadTokens: 120,
      reasoningTokens: 80,
      totalTokens: 1234,
      latencyMs: 8400,
    },
  };
}
