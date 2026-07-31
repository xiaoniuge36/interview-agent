import type { ProductRequestContext } from '../../common/context/request-context';
import { PracticeRagRecommendationService } from './practice-rag-recommendation.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'user-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['practice:read'],
  },
};

const rules = {
  recommendation: {
    role: 'AI Agent Engineer',
    weakTag: 'RAG',
    focusTag: 'retrieval quality',
    category: 'ai_agent' as const,
    source: 'mastery' as const,
  },
  questions: [{ id: 'rule-1', title: 'Rule question' }],
};

test('does not read retrieval while the training RAG flag is disabled', async () => {
  const retrieval = { search: jest.fn() };
  const service = new PracticeRagRecommendationService(
    { question: { findMany: jest.fn() } } as never,
    { get: jest.fn().mockReturnValue(false) } as never,
    retrieval as never,
  );

  await expect(service.enhance(context, rules, [])).resolves.toBeNull();
  expect(retrieval.search).not.toHaveBeenCalled();
});

test('returns visible retrieved questions and source evidence when hybrid retrieval hits', async () => {
  const retrieval = {
    search: jest.fn().mockResolvedValue({
      hits: retrievalHits(),
    }),
  };
  const prisma = {
    question: {
      findMany: jest.fn().mockResolvedValue([{ id: 'rag-1', title: 'Hybrid retrieval' }]),
    },
  };
  const service = new PracticeRagRecommendationService(
    prisma as never,
    { get: jest.fn().mockReturnValue(true) } as never,
    retrieval as never,
  );

  const result = await service.enhance(context, rules, ['recent-1']);

  expect(result).toMatchObject({
    algorithm: 'hybrid',
    questions: [{ id: 'rag-1', title: 'Hybrid retrieval' }],
    evidence: [expect.objectContaining({ type: 'retrieval', sourceId: 'chunk-1' })],
  });
  expect(prisma.question.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        id: { in: ['rag-1'], notIn: ['recent-1'] },
        OR: [{ tenantId: 'tenant-1' }, { visibility: 'public' }],
      }),
    }),
  );
});

function retrievalHits() {
  return [
    retrievalHit('chunk-1', 'How do you evaluate hybrid retrieval?', 0.9),
    retrievalHit('chunk-2', 'A second chunk from the same question.', 0.8),
  ];
}

function retrievalHit(id: string, content: string, score: number) {
  return {
    id,
    tenantId: 'tenant-1',
    entityType: 'question',
    entityId: 'rag-1',
    content,
    metadata: {},
    score,
    source: 'hybrid',
  };
}
