import type { ProductRequestContext } from '../../common/context/request-context';
import type { PrismaService } from '../../common/database/prisma.service';
import { PracticeEvaluationCommandService } from './practice-evaluation-command.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'user-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['practice:answer'],
  },
};

test('真实模型评价持久化后返回标准解析与追问', async () => {
  const session = sessionRecord();
  const evaluation = evaluationRecord();
  const transaction = {
    practiceSession: { findFirst: jest.fn().mockResolvedValue(session) },
    evaluationResult: { upsert: jest.fn().mockResolvedValue(evaluation) },
    practiceSessionItem: { update: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    ...transaction,
    jobIntent: { findFirst: jest.fn().mockResolvedValue({ targetRole: '后端工程师' }) },
    $transaction: jest.fn(async (operation: (client: unknown) => unknown) =>
      operation(transaction),
    ),
  };
  const model = { evaluate: jest.fn().mockResolvedValue(evaluation) };
  const service = new PracticeEvaluationCommandService(
    {
      prisma: prisma as unknown as PrismaService,
      policy: { assert: jest.fn() },
      audit: { record: jest.fn() },
    } as never,
    model as never,
  );

  const result = await service.evaluate({ context, sessionId: session.id, itemId: 'item-1' });

  expect(model.evaluate).toHaveBeenCalledWith(
    context,
    expect.objectContaining({ answer: '用户回答', targetRole: '后端工程师' }),
  );
  expect(result.referenceAnswer).toBe('参考答案');
  expect(result.evaluation.followUpQuestion).toContain('补偿');
});

function sessionRecord() {
  return {
    id: 'session-1',
    tenantId: context.tenantId,
    userId: context.actor.id,
    jobIntentId: 'job-1',
    status: 'in_progress',
    items: [
      {
        id: 'item-1',
        tenantId: context.tenantId,
        answer: '用户回答',
        question: {
          title: '系统设计题',
          stem: '说明系统边界。',
          answer: '参考答案',
          rubric: [{ point: '边界', score: 10, description: '说明职责。' }],
          tags: ['系统设计'],
        },
      },
    ],
  };
}

function evaluationRecord() {
  return {
    id: 'evaluation-1',
    tenantId: context.tenantId,
    sessionItemId: 'item-1',
    score: 80,
    feedback: '回答较完整。',
    missingPoints: ['失败恢复'],
    rubricScores: [{ point: '边界', score: 85 }],
    followUpQuestion: '失败后如何补偿？',
    createdAt: new Date('2026-07-15T00:00:00.000Z'),
  };
}
