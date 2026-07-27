import type { ProductRequestContext } from '../../common/context/request-context';
import type { PrismaService } from '../../common/database/prisma.service';
import { PracticeCommandService } from './practice-command.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'user-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['practice:create'],
  },
};

describe('PracticeCommandService weakness review', () => {
  it('creates a weakness review from the current user historical evidence', async () => {
    const question = questionRecord('question-low');
    const { service, transaction } = commandService([evidence(question)]);

    const session = await service.create(context, {
      title: '薄弱项复练',
      mode: 'weakness_review',
    });

    expect(session).toMatchObject({ mode: 'weakness_review', title: '薄弱项复练' });
    expect(transaction.practiceSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mode: 'weakness_review',
          items: {
            create: [
              expect.objectContaining({
                question: {
                  connect: { tenantId_id: { tenantId: context.tenantId, id: question.id } },
                },
              }),
            ],
          },
        }),
      }),
    );
  });

  it('rejects creation when the user has no weakness evidence', async () => {
    const { service, transaction } = commandService([]);

    await expect(service.create(context, { mode: 'weakness_review' })).rejects.toMatchObject({
      response: {
        code: 'PRACTICE_WEAKNESSES_UNAVAILABLE',
        message: '还没有可复练的薄弱项，请先完成一轮 AI 评价。',
      },
    });
    expect(transaction.practiceSession.create).not.toHaveBeenCalled();
  });
});

function commandService(records: ReturnType<typeof evidence>[]) {
  const question = records[0]?.sessionItem.question ?? questionRecord('unused');
  const transaction = {
    practiceSession: { create: jest.fn().mockResolvedValue(sessionRecord(question)) },
  };
  const prisma = {
    evaluationResult: { findMany: jest.fn().mockResolvedValue(records) },
    question: { findMany: jest.fn() },
    $transaction: jest.fn(async (operation: (client: unknown) => unknown) =>
      operation(transaction),
    ),
  };
  return {
    service: new PracticeCommandService(
      prisma as unknown as PrismaService,
      { assert: jest.fn() } as never,
      { record: jest.fn() } as never,
    ),
    transaction,
  };
}

function evidence(question: ReturnType<typeof questionRecord>) {
  return { score: 35, sessionItem: { question } };
}

function questionRecord(id: string) {
  const date = new Date('2026-07-23T00:00:00.000Z');
  return {
    id,
    tenantId: context.tenantId,
    visibility: 'tenant' as const,
    title: `Question ${id}`,
    stem: 'Explain the trade-off.',
    type: 'short_answer' as const,
    difficulty: 'medium' as const,
    tags: ['system-design'],
    answer: 'A complete answer.',
    rubric: [{ point: 'trade-off', score: 10, description: 'Explains the trade-off.' }],
    sourceRefs: ['fixture://weakness-review'],
    status: 'published' as const,
    createdAt: date,
    updatedAt: date,
  };
}

function sessionRecord(question: ReturnType<typeof questionRecord>) {
  const date = new Date('2026-07-23T00:00:00.000Z');
  return {
    id: 'weakness-session',
    tenantId: context.tenantId,
    userId: context.actor.id,
    jobIntentId: null,
    mode: 'weakness_review' as const,
    title: '薄弱项复练',
    status: 'in_progress' as const,
    startedAt: date,
    submittedAt: null,
    reportedAt: null,
    createdAt: date,
    updatedAt: date,
    items: [
      {
        id: 'weakness-item',
        tenantId: context.tenantId,
        sessionId: 'weakness-session',
        questionTenantId: question.tenantId,
        questionId: question.id,
        sequence: 1,
        status: 'pending' as const,
        answer: null,
        answeredAt: null,
        createdAt: date,
        updatedAt: date,
        question,
        evaluation: null,
      },
    ],
    report: null,
  };
}
