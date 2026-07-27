import type { ProductRequestContext } from '../../common/context/request-context';
import type { PrismaService } from '../../common/database/prisma.service';
import { selectWeaknessQuestions } from './practice-weakness-selector';

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

describe('selectWeaknessQuestions', () => {
  it('scopes evidence to the current user and sorts current weaknesses by score', async () => {
    const prisma = weaknessPrisma([evidence('question-next', 55), evidence('question-low', 35)]);

    await expect(
      selectWeaknessQuestions(prisma as unknown as PrismaService, context),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'question-low' }),
      expect.objectContaining({ id: 'question-next' }),
    ]);
    expect(prisma.evaluationResult.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: context.tenantId,
          sessionItem: {
            session: { userId: context.actor.id },
            question: {
              status: 'published',
              OR: [{ tenantId: context.tenantId }, { visibility: 'public' }],
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('ignores an old low score after the latest attempt reaches the expected level', async () => {
    const prisma = weaknessPrisma([
      evidence('question-improved', 90),
      evidence('question-current', 48),
      evidence('question-improved', 30),
    ]);

    const questions = await selectWeaknessQuestions(prisma as unknown as PrismaService, context);

    expect(questions.map((question) => question.id)).toEqual(['question-current']);
  });

  it('deduplicates repeated questions and limits a review to five questions', async () => {
    const prisma = weaknessPrisma([
      evidence('question-1', 20),
      evidence('question-1', 25),
      ...Array.from({ length: 6 }, (_, index) => evidence(`question-${index + 2}`, 30 + index)),
    ]);

    const questions = await selectWeaknessQuestions(prisma as unknown as PrismaService, context);

    expect(questions.map((question) => question.id)).toEqual([
      'question-1',
      'question-2',
      'question-3',
      'question-4',
      'question-5',
    ]);
  });
});

function weaknessPrisma(records: ReturnType<typeof evidence>[]) {
  return {
    evaluationResult: { findMany: jest.fn().mockResolvedValue(records) },
  };
}

function evidence(questionId: string, score: number) {
  return {
    score,
    sessionItem: { question: questionRecord(questionId) },
  };
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
