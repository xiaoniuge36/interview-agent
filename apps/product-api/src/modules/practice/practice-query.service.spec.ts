import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { PracticeQueryService } from './practice-query.service';

describe('PracticeQueryService history', () => {
  const findMany = jest.fn();
  const policy = { assert: jest.fn() } as unknown as PolicyService;
  const prisma = {
    practiceSession: { findMany },
  } as unknown as PrismaService;
  const service = new PracticeQueryService(prisma, policy, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the current user practice summaries in recent-first order', async () => {
    findMany.mockResolvedValue([
      {
        id: 'practice-newer',
        title: 'System design review',
        mode: 'manual',
        status: 'report_ready',
        reportedAt: new Date('2026-07-22T09:00:00.000Z'),
        updatedAt: new Date('2026-07-22T10:00:00.000Z'),
        items: [
          { answer: 'answer', evaluation: { id: 'evaluation-1' } },
          { answer: null, evaluation: null },
        ],
        report: { overallScore: 86, weaknesses: ['Explain trade-offs'] },
      },
    ]);

    await expect(service.history(context())).resolves.toEqual([
      expect.objectContaining({
        id: 'practice-newer',
        questionCount: 2,
        answeredCount: 1,
        evaluatedCount: 1,
        overallScore: 86,
        weaknesses: ['Explain trade-offs'],
      }),
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-a', userId: 'user-a' },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    );
  });
});

describe('PracticeQueryService mistake book', () => {
  it('delegates scoped listing and review creation after authorization', async () => {
    const mistakes = {
      list: jest.fn().mockResolvedValue({ items: [] }),
      startReview: jest.fn().mockResolvedValue({ id: 'review-session-1' }),
    };
    const policy = { assert: jest.fn() } as unknown as PolicyService;
    const service = new PracticeQueryService({} as PrismaService, policy, mistakes as never);
    const requestContext = context();

    await service.mistakes(requestContext, { page: 1, pageSize: 20 });
    await service.reviewMistake(requestContext, 'evaluation-1');

    expect(policy.assert).toHaveBeenCalledWith(requestContext.actor, 'practice:read', {
      tenantId: 'tenant-a',
      ownerId: 'user-a',
    });
    expect(mistakes.list).toHaveBeenCalledWith(requestContext, { page: 1, pageSize: 20 });
    expect(mistakes.startReview).toHaveBeenCalledWith(requestContext, 'evaluation-1');
  });
});

function context(): ProductRequestContext {
  return {
    requestId: 'request-a',
    traceId: 'trace-a',
    tenantId: 'tenant-a',
    actor: {
      id: 'user-a',
      subject: 'user-a',
      tenantId: 'tenant-a',
      role: 'user',
      scopes: ['practice:read'],
    },
  };
}
