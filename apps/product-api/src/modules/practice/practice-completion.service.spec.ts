import type { ProductRequestContext } from '../../common/context/request-context';
import type { PrismaService } from '../../common/database/prisma.service';
import { PracticeCompletionService } from './practice-completion.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'user-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['practice:submit'],
  },
};

test('无模型自学完成要求全部题目已保存并且不创建报告', async () => {
  const session = {
    id: 'session-1',
    tenantId: context.tenantId,
    userId: context.actor.id,
    status: 'in_progress',
    items: [{ answer: 'answer' }, { answer: 'answer-2' }],
    report: null,
  };
  const transaction = {
    practiceSession: {
      findFirst: jest.fn().mockResolvedValue(session),
      update: jest.fn().mockResolvedValue({}),
    },
    practiceReport: { create: jest.fn() },
  };
  const prisma = {
    ...transaction,
    $transaction: jest.fn(async (operation: (client: unknown) => unknown) =>
      operation(transaction),
    ),
  };
  const service = new PracticeCompletionService(
    {
      prisma: prisma as unknown as PrismaService,
      policy: { assert: jest.fn() },
      audit: { record: jest.fn() },
    } as never,
    { evaluate: jest.fn() } as never,
  );

  await service.completeSelfStudy(context, session.id);

  expect(prisma.practiceSession.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ status: 'submitted' }) }),
  );
  expect(prisma.practiceReport.create).not.toHaveBeenCalled();
});

test('整轮复盘会自动补齐尚未评价的已保存题目', async () => {
  const fixture = completionFixture();
  fixture.evaluations.evaluate.mockImplementation(async ({ itemId }: { itemId: string }) => {
    const item = fixture.session.items.find((candidate) => candidate.id === itemId)!;
    item.evaluation = evaluationRecord(item.id, 72);
  });

  const report = await fixture.service.submit(context, fixture.session.id);

  expect(fixture.evaluations.evaluate).toHaveBeenCalledTimes(1);
  expect(fixture.evaluations.evaluate).toHaveBeenCalledWith({
    context,
    sessionId: fixture.session.id,
    itemId: 'item-2',
  });
  expect(fixture.transaction.practiceReport.create).toHaveBeenCalledTimes(1);
  expect(report.itemEvaluations).toHaveLength(2);
});

test('自动评价失败时保留会话且不生成半成品报告', async () => {
  const fixture = completionFixture();
  fixture.evaluations.evaluate.mockRejectedValue(new Error('model unavailable'));

  await expect(fixture.service.submit(context, fixture.session.id)).rejects.toThrow(
    'model unavailable',
  );

  expect(fixture.transaction.practiceReport.create).not.toHaveBeenCalled();
  expect(fixture.transaction.practiceSession.updateMany).not.toHaveBeenCalled();
});

function completionFixture() {
  const session = sessionRecord();
  const transaction = {
    practiceSession: {
      findFirst: jest.fn(async () => session),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    practiceReport: { create: jest.fn().mockResolvedValue(reportRecord()) },
    masteryProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    ...transaction,
    $transaction: jest.fn(async (operation: (client: unknown) => unknown) =>
      operation(transaction),
    ),
  };
  const evaluations = { evaluate: jest.fn() };
  const service = new PracticeCompletionService(
    {
      prisma: prisma as unknown as PrismaService,
      policy: { assert: jest.fn() },
      audit: { record: jest.fn() },
    } as never,
    evaluations as never,
  );
  return { session, transaction, evaluations, service };
}

function sessionRecord() {
  return {
    id: 'session-1',
    tenantId: context.tenantId,
    userId: context.actor.id,
    jobIntentId: null,
    title: '系统设计强化',
    status: 'in_progress',
    report: null,
    items: [sessionItem('item-1', evaluationRecord('item-1', 84)), sessionItem('item-2', null)],
  };
}

function sessionItem(itemId: string, evaluation: ReturnType<typeof evaluationRecord> | null) {
  return {
    id: itemId,
    tenantId: context.tenantId,
    answer: `answer-${itemId}`,
    evaluation,
    question: { tags: ['系统设计'] },
  };
}

function evaluationRecord(sessionItemId: string, score: number) {
  return {
    id: `evaluation-${sessionItemId}`,
    tenantId: context.tenantId,
    sessionItemId,
    score,
    feedback: '回答包含关键判断。',
    missingPoints: score < 80 ? ['容量规划'] : [],
    rubricScores: [{ point: '系统边界', score }],
    followUpQuestion: '如何验证容量规划？',
    createdAt: new Date('2026-07-17T00:00:00.000Z'),
  };
}

function reportRecord() {
  return {
    id: 'report-1',
    tenantId: context.tenantId,
    sessionId: 'session-1',
    overallScore: 78,
    summary: '本轮回答覆盖了核心能力点。',
    strengths: ['能够说明系统边界。'],
    weaknesses: ['容量规划'],
    nextActions: ['补充容量估算案例。'],
    reportMarkdown: '# 系统设计强化',
    structuredData: {},
    createdAt: new Date('2026-07-17T00:00:00.000Z'),
    updatedAt: new Date('2026-07-17T00:00:00.000Z'),
  };
}
