import type { ProductRequestContext } from '../../common/context/request-context';
import type { PrismaService } from '../../common/database/prisma.service';
import { PracticeQueryService } from './practice-query.service';
import { PracticeRecommendationService } from './practice-recommendation.service';

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

describe('PracticeRecommendationService', () => {
  it('prioritizes the latest low mastery tag within the current role category', async () => {
    const { service, prisma } = createRecommendationService();
    prisma.jobIntent.findFirst.mockResolvedValue({ targetRole: 'AI Agent 工程师' });
    prisma.userProfile.findUnique.mockResolvedValue({ targetRole: '后端工程师' });
    prisma.masteryProfile.findMany.mockResolvedValue([{ tag: '模型评估', score: 42 }]);
    prisma.practiceSessionItem.findMany.mockResolvedValue([{ questionId: 'question-old' }]);
    prisma.question.findMany.mockResolvedValue(questionRecords());

    const result = await service.list(context);

    expect(result[0]).toMatchObject({ source: 'mastery', category: 'ai_agent' });
    expect(result[0]?.reason).toContain('模型评估');
    expect(result[0]?.questionIds).not.toContain('question-old');
    expect(prisma.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: { hasEvery: ['role:ai_agent', '模型评估'] },
          id: { notIn: ['question-old'] },
        }),
      }),
    );
  });

  it('falls back to curated questions when profile context is empty', async () => {
    const { service, prisma } = createRecommendationService();
    prisma.jobIntent.findFirst.mockResolvedValue(null);
    prisma.userProfile.findUnique.mockResolvedValue(null);
    prisma.masteryProfile.findMany.mockResolvedValue([]);
    prisma.practiceSessionItem.findMany.mockResolvedValue([]);
    prisma.question.findMany.mockResolvedValue(questionRecords());

    await expect(service.list(context)).resolves.toEqual([
      expect.objectContaining({ source: 'curated', category: null }),
    ]);
  });

  it('falls back to curated questions when personalized tags have no matches', async () => {
    const { service, prisma } = createRecommendationService();
    prisma.jobIntent.findFirst.mockResolvedValue({ targetRole: 'AI Agent 工程师' });
    prisma.userProfile.findUnique.mockResolvedValue(null);
    prisma.masteryProfile.findMany.mockResolvedValue([]);
    prisma.practiceSessionItem.findMany.mockResolvedValue([]);
    prisma.question.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(questionRecords());

    await expect(service.list(context)).resolves.toEqual([
      expect.objectContaining({ source: 'curated', category: null }),
    ]);
    expect(prisma.question.findMany).toHaveBeenCalledTimes(2);
  });
});

describe('PracticeQueryService recent session', () => {
  it('returns the latest unfinished practice summary', async () => {
    const prisma = {
      practiceSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          title: '系统设计强化',
          mode: 'manual',
          status: 'in_progress',
          items: [{ answer: 'answer' }, { answer: null }],
          updatedAt: new Date('2026-07-15T00:00:00.000Z'),
        }),
      },
    };
    const policy = { assert: jest.fn() };
    const service = new PracticeQueryService(
      prisma as unknown as PrismaService,
      policy as never,
    );

    await expect(service.recent(context)).resolves.toMatchObject({
      id: 'session-1',
      questionCount: 2,
      answeredCount: 1,
    });
  });

});

describe('PracticeQueryService item solution', () => {
  it('reveals the standard solution only after the owned item has an answer', async () => {
    const prisma = {
      practiceSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          tenantId: context.tenantId,
          userId: context.actor.id,
          status: 'in_progress',
          items: [
            {
              id: 'item-1',
              answer: '用户回答',
              question: {
                answer: '标准解析',
                rubric: [{ point: '边界', score: 10, description: '说明职责。' }],
              },
            },
          ],
        }),
      },
    };
    const service = new PracticeQueryService(
      prisma as unknown as PrismaService,
      { assert: jest.fn() } as never,
    );

    await expect(service.solution(context, 'session-1', 'item-1')).resolves.toMatchObject({
      referenceAnswer: '标准解析',
    });
  });
});

function createRecommendationService() {
  const prisma = {
    jobIntent: { findFirst: jest.fn() },
    userProfile: { findUnique: jest.fn() },
    masteryProfile: { findMany: jest.fn() },
    practiceSessionItem: { findMany: jest.fn() },
    question: { findMany: jest.fn() },
  };
  const policy = { assert: jest.fn() };
  return {
    service: new PracticeRecommendationService(
      prisma as unknown as PrismaService,
      policy as never,
    ),
    prisma,
  };
}

function questionRecords() {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `question-${index + 1}`,
    title: `AI Agent 题目 ${index + 1}`,
  }));
}
