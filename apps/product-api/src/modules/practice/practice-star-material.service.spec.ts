import type { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import type { PrismaService } from '../../common/database/prisma.service';
import { PracticeStarMaterialService } from './practice-star-material.service';

const context = {
  tenantId: 'tenant-1',
  actor: { id: 'user-1', role: 'user' },
} as ProductRequestContext;

function starRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'eval-1',
    sessionItemId: 'item-1',
    score: 84,
    improvedAnswer: '示范回答',
    dimensionScores: [{ dimension: 'structure', score: 80, comment: '结构完整' }],
    createdAt: new Date('2026-08-27T10:00:00.000Z'),
    sessionItem: {
      answer: '我在项目中主导了灰度发布方案。',
      session: { id: 'session-1', userId: 'user-1' },
      question: {
        id: 'q-1',
        title: '讲一次你主导的高风险发布',
        type: 'behavioral',
        tags: ['发布', 'role:engineering', 'company:字节跳动'],
      },
    },
    ...overrides,
  };
}

function serviceWith(records: unknown[]) {
  const findMany = jest.fn().mockResolvedValue(records);
  const prisma = { evaluationResult: { findMany } } as unknown as PrismaService;
  const assert = jest.fn();
  const policy = { assert } as unknown as PolicyService;
  return { service: new PracticeStarMaterialService(prisma, policy), findMany, assert };
}

describe('PracticeStarMaterialService', () => {
  it('只查询当前用户 70 分以上的行为/项目题作答', async () => {
    const { service, findMany, assert } = serviceWith([]);

    await service.list(context);

    expect(assert).toHaveBeenCalledWith(context.actor, 'practice:read', {
      tenantId: 'tenant-1',
      ownerId: 'user-1',
    });
    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      tenantId: 'tenant-1',
      score: { gte: 70 },
      sessionItem: {
        answer: { not: null },
        session: { userId: 'user-1' },
        question: { type: { in: ['behavioral', 'project_deep_dive'] } },
      },
    });
    expect(args.orderBy).toEqual([{ score: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]);
    expect(args.take).toBe(30);
  });

  it('把评价记录映射为素材并过滤机器前缀标签', async () => {
    const { service } = serviceWith([starRecord()]);

    const materials = await service.list(context);

    expect(materials).toEqual([
      {
        id: 'eval-1',
        practiceItemId: 'item-1',
        questionId: 'q-1',
        questionTitle: '讲一次你主导的高风险发布',
        questionType: 'behavioral',
        tags: ['发布'],
        answer: '我在项目中主导了灰度发布方案。',
        improvedAnswer: '示范回答',
        score: 84,
        dimensionScores: [{ dimension: 'structure', score: 80, comment: '结构完整' }],
        evaluatedAt: '2026-08-27T10:00:00.000Z',
      },
    ]);
  });

  it('兼容存量记录缺失维度评分与示范答案', async () => {
    const { service } = serviceWith([
      starRecord({ dimensionScores: null, improvedAnswer: null }),
    ]);

    const materials = await service.list(context);

    expect(materials[0]?.dimensionScores).toEqual([]);
    expect(materials[0]?.improvedAnswer).toBeNull();
  });
});
