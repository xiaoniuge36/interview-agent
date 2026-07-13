import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AgentRuntimeNextRequestSchema,
  QuestionSchema,
  SubmitInterviewAnswerInputSchema,
  seedQuestions,
} from './index';

const validRuntimeRequest = {
  contractVersion: 'interview-runtime.v1',
  session: {
    id: 'session-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    status: 'running',
    stage: 'warmup',
    version: 0,
    title: 'Contract test',
    candidateTurnCount: 0,
    recentTurns: [],
  },
  commandId: 'command-1',
  traceId: 'trace-12345678',
};

test('all public question fixtures satisfy the shared contract', () => {
  assert.ok(seedQuestions.length > 0);
  for (const question of seedQuestions) {
    assert.deepEqual(QuestionSchema.parse(question), question);
  }
});

test('runtime requests reject unsupported contract versions', () => {
  const result = AgentRuntimeNextRequestSchema.safeParse({
    ...validRuntimeRequest,
    contractVersion: 'interview-runtime.v2',
  });
  assert.equal(result.success, false);
});

test('answer input trims content and rejects blank answers', () => {
  const parsed = SubmitInterviewAnswerInputSchema.parse({
    answer: '  structured answer  ',
    expectedVersion: 0,
  });
  assert.equal(parsed.answer, 'structured answer');
  assert.equal(
    SubmitInterviewAnswerInputSchema.safeParse({ answer: '   ', expectedVersion: 0 }).success,
    false,
  );
});
