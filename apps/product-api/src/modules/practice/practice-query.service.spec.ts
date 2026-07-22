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
  const service = new PracticeQueryService(prisma, policy);

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
