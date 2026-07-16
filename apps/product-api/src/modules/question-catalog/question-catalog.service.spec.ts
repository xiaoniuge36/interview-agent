import { QuestionCatalogQuerySchema } from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import type { PrismaService } from '../../common/database/prisma.service';
import { QuestionCatalogService } from './question-catalog.service';

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

describe('QuestionCatalogService', () => {
  it('scopes public and tenant questions and applies user filters', async () => {
    const { service, prisma, policy } = createService();
    prisma.question.count.mockResolvedValue(1);
    prisma.question.findMany
      .mockResolvedValueOnce([questionRecord()])
      .mockResolvedValueOnce([facetRecord()]);
    const query = QuestionCatalogQuerySchema.parse({
      query: 'Agent',
      category: 'ai_agent',
      tags: '状态管理',
      type: 'system_design',
      difficulty: 'hard',
      page: 2,
      pageSize: 10,
    });

    const result = await service.list(context, query);

    expect(policy.assert).toHaveBeenCalledWith(context.actor, 'practice:read', {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
    expect(prisma.question.count).toHaveBeenCalledWith({ where: expectedWhere() });
    expect(prisma.question.findMany).toHaveBeenNthCalledWith(1, {
      where: expectedWhere(),
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip: 10,
      take: 10,
    });
    expect(result.items[0]?.tags).toEqual(['Agent 工作流', '状态管理']);
    expect(result.facets.categories).toContainEqual({ value: 'ai_agent', label: 'AI Agent', count: 1 });
    expect(result.totalPages).toBe(1);
  });
});

function createService() {
  const prisma = { question: { count: jest.fn(), findMany: jest.fn() } };
  const policy = { assert: jest.fn() };
  return {
    service: new QuestionCatalogService(prisma as unknown as PrismaService, policy as never),
    prisma,
    policy,
  };
}

function expectedWhere() {
  return {
    status: 'published',
    type: 'system_design',
    difficulty: 'hard',
    tags: { hasEvery: ['role:ai_agent', '状态管理'] },
    AND: [
      { OR: [{ tenantId: context.tenantId }, { visibility: 'public' }] },
      {
        OR: [
          { title: { contains: 'Agent', mode: 'insensitive' } },
          { stem: { contains: 'Agent', mode: 'insensitive' } },
          { tags: { has: 'Agent' } },
        ],
      },
    ],
  };
}

function questionRecord() {
  return {
    id: 'question-1',
    tenantId: 'public',
    visibility: 'public',
    title: '如何设计多步骤 Agent 工作流？',
    stem: '说明任务拆解、状态管理和失败恢复。',
    type: 'system_design',
    difficulty: 'hard',
    tags: ['role:ai_agent', 'Agent 工作流', '状态管理'],
    answer: '先拆分任务，再设计状态与恢复机制。',
    rubric: [],
    sourceRefs: [],
    status: 'published',
  };
}

function facetRecord() {
  return {
    tags: ['role:ai_agent', 'Agent 工作流', '状态管理'],
    type: 'system_design',
    difficulty: 'hard',
  };
}
