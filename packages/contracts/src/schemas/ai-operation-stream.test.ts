import assert from 'node:assert/strict';
import test from 'node:test';
import { AiOperationStreamEventSchema } from './ai-operation-stream';

const metadata = {
  operationId: 'operation-1',
  occurredAt: '2026-07-17T00:00:00.000Z',
  traceId: 'trace-12345678',
};

test('accepts a visible content delta with stream metadata', () => {
  const result = AiOperationStreamEventSchema.safeParse({
    ...metadata,
    type: 'delta',
    channel: 'interviewer_content',
    content: '请介绍一次最有挑战的项目经历。',
  });
  assert.equal(result.success, true);
});

test('rejects channels that could expose internal model output', () => {
  const result = AiOperationStreamEventSchema.safeParse({
    ...metadata,
    type: 'delta',
    channel: 'reasoning',
    content: '隐藏过程',
  });
  assert.equal(result.success, false);
});

test('limits interview basis summaries to three user-readable items', () => {
  const result = AiOperationStreamEventSchema.safeParse({
    ...metadata,
    type: 'result',
    operation: 'interview_next',
    result: {},
    basisSummary: ['a', 'b', 'c', 'd'],
  });
  assert.equal(result.success, false);
});
