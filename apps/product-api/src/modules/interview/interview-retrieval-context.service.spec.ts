import { Logger } from '@nestjs/common';
import type { ProductRequestContext } from '../../common/context/request-context';
import { InterviewRetrievalContextService } from './interview-retrieval-context.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'user-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['interview:read'],
  },
};

const input = {
  context,
  answer: 'I used an outbox to make publication reliable.',
  session: { title: 'Backend interview' },
};

test('does not call retrieval while interview RAG is disabled', async () => {
  const retrieval = { search: jest.fn() };
  const service = new InterviewRetrievalContextService(
    { get: jest.fn().mockReturnValue(false) } as never,
    retrieval as never,
  );

  await expect(service.forCommand(input)).resolves.toEqual([]);
  expect(retrieval.search).not.toHaveBeenCalled();
});

test('returns a bounded read-only context with server-issued source ids', async () => {
  const retrieval = {
    search: jest.fn().mockResolvedValue({
      hits: [
        {
          id: 'chunk-1',
          tenantId: 'tenant-1',
          entityType: 'question',
          entityId: 'question-1',
          content: 'Explain outbox delivery guarantees.',
          metadata: {},
          score: 0.9,
          source: 'hybrid',
        },
      ],
    }),
  };
  const service = new InterviewRetrievalContextService(
    { get: jest.fn().mockReturnValue(true) } as never,
    retrieval as never,
  );

  await expect(service.forCommand(input)).resolves.toEqual([
    {
      sourceId: 'chunk-1',
      entityType: 'question',
      content: 'Explain outbox delivery guarantees.',
    },
  ]);
  expect(retrieval.search).toHaveBeenCalledWith(
    context,
    expect.objectContaining({ query: input.answer, purpose: 'interview', limit: 6 }),
  );
});

test('logs the degradation and continues without context when retrieval fails', async () => {
  const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  const retrieval = { search: jest.fn().mockRejectedValue(new Error('retrieval down')) };
  const service = new InterviewRetrievalContextService(
    { get: jest.fn().mockReturnValue(true) } as never,
    retrieval as never,
  );

  await expect(service.forCommand(input)).resolves.toEqual([]);
  expect(warn).toHaveBeenCalledWith(
    expect.stringContaining('Interview retrieval context unavailable'),
  );
  warn.mockRestore();
});
