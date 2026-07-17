import { describe, expect, it } from 'vitest';
import { parseAiOperationFrame } from './ai-operation-stream';

const metadata = {
  operationId: 'operation-1',
  occurredAt: '2026-07-17T00:00:00.000Z',
  traceId: 'trace-12345678',
};

describe('parseAiOperationFrame', () => {
  it('parses a visible delta and ignores a heartbeat comment', () => {
    expect(parseAiOperationFrame(': heartbeat')).toBeNull();
    expect(
      parseAiOperationFrame(
        `event: delta\ndata: ${JSON.stringify({
          ...metadata,
          type: 'delta',
          channel: 'evaluation_feedback',
          content: '回答覆盖了核心边界。',
        })}`,
      ),
    ).toMatchObject({ type: 'delta', content: '回答覆盖了核心边界。' });
  });

  it('rejects unknown stream event payloads', () => {
    expect(() =>
      parseAiOperationFrame(
        `event: delta\ndata: ${JSON.stringify({ ...metadata, type: 'delta', channel: 'reasoning', content: 'hidden' })}`,
      ),
    ).toThrow('AI 操作连接异常');
  });
});
