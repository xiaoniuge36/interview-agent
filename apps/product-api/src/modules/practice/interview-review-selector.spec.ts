import type { ProductRequestContext } from '../../common/context/request-context';
import { PracticeCommandService } from './practice-command.service';
import {
  deriveInterviewReviewFocus,
  selectInterviewReviewQuestions,
} from './interview-review-selector';

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

it('maps the two lowest actionable interview stages to practice question types', () => {
  expect(
    deriveInterviewReviewFocus([
      stageScore('jd_core', 58),
      stageScore('project_deep_dive', 42),
      stageScore('hr', 76),
    ]),
  ).toEqual([
    { stage: 'project_deep_dive', questionType: 'project_deep_dive', score: 42 },
    { stage: 'jd_core', questionType: 'short_answer', score: 58 },
  ]);
});

it('prefers source-role questions before falling back to same-type public questions', async () => {
  const prisma = selectorPrisma({
    stageScores: [stageScore('jd_core', 52)],
    roleQuestions: [questionRecord('role-question')],
    fallbackQuestions: [questionRecord('fallback-question')],
  });

  await expect(
    selectInterviewReviewQuestions(prisma as never, context, 'interview-1'),
  ).resolves.toEqual([
    expect.objectContaining({ id: 'role-question' }),
    expect.objectContaining({ id: 'fallback-question' }),
  ]);
  expect(prisma.question.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ type: { in: ['short_answer'] } }),
    }),
  );
  expect(prisma.question.findMany).toHaveBeenCalledTimes(2);
});

it('rejects an owned report that has no actionable training stage', async () => {
  const prisma = selectorPrisma({ stageScores: [stageScore('jd_core', 70)] });

  await expect(
    selectInterviewReviewQuestions(prisma as never, context, 'interview-1'),
  ).rejects.toMatchObject({
    response: { code: 'INTERVIEW_REVIEW_NOT_ACTIONABLE' },
  });
});

it('rejects a source outside the owned ready-report scope', async () => {
  const prisma = selectorPrisma({
    stageScores: [stageScore('jd_core', 52)],
    source: null,
  });

  await expect(
    selectInterviewReviewQuestions(prisma as never, context, 'interview-1'),
  ).rejects.toMatchObject({
    response: { code: 'INTERVIEW_REVIEW_SOURCE_NOT_FOUND' },
  });
  expect(prisma.interviewSession.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        tenantId: context.tenantId,
        userId: context.actor.id,
        status: 'report_ready',
      }),
    }),
  );
});

it('rejects an actionable report when no matching published questions exist', async () => {
  const prisma = selectorPrisma({ stageScores: [stageScore('jd_core', 52)] });

  await expect(
    selectInterviewReviewQuestions(prisma as never, context, 'interview-1'),
  ).rejects.toMatchObject({
    response: { code: 'INTERVIEW_REVIEW_QUESTIONS_UNAVAILABLE' },
  });
});

it('creates a source-linked practice session from an owned ready interview report', async () => {
  const question = questionRecord('interview-question');
  const prisma = selectorPrisma({
    stageScores: [stageScore('project_deep_dive', 42)],
    roleQuestions: [question],
  });
  const transaction = {
    practiceSession: { create: jest.fn().mockResolvedValue(sessionRecord(question)) },
  };
  prisma.$transaction.mockImplementation(
    async (operation: (client: typeof transaction) => unknown) => operation(transaction),
  );
  const service = new PracticeCommandService(
    prisma as never,
    { assert: jest.fn() } as never,
    { record: jest.fn() } as never,
  );

  const result = await service.create(context, {
    mode: 'interview_review',
    sourceInterviewSessionId: 'interview-1',
  });

  expect(result).toMatchObject({
    mode: 'interview_review',
    sourceInterviewSessionId: 'interview-1',
  });
  expect(transaction.practiceSession.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        mode: 'interview_review',
        sourceInterviewSession: {
          connect: { tenantId_id: { tenantId: 'tenant-1', id: 'interview-1' } },
        },
      }),
    }),
  );
});

function selectorPrisma(options: {
  stageScores: ReturnType<typeof stageScore>[];
  roleQuestions?: ReturnType<typeof questionRecord>[];
  fallbackQuestions?: ReturnType<typeof questionRecord>[];
  source?: {
    id: string;
    status: 'report_ready';
    jobIntent: { targetRole: string };
    report: unknown;
  } | null;
}) {
  return {
    interviewSession: {
      findFirst: jest.fn().mockResolvedValue(
        options.source === undefined
          ? {
              id: 'interview-1',
              status: 'report_ready',
              jobIntent: { targetRole: '后端工程师' },
              report: { stageScores: options.stageScores },
            }
          : options.source,
      ),
    },
    question: {
      findMany: jest
        .fn()
        .mockResolvedValueOnce(options.roleQuestions ?? [])
        .mockResolvedValueOnce(options.fallbackQuestions ?? []),
    },
    $transaction: jest.fn(),
  };
}

function stageScore(stage: 'jd_core' | 'project_deep_dive' | 'hr', score: number) {
  return { stage, score, summary: '报告摘要', evidence: [] };
}

function questionRecord(id: string) {
  const date = new Date('2026-07-27T00:00:00.000Z');
  return {
    id,
    tenantId: context.tenantId,
    visibility: 'tenant' as const,
    title: `Question ${id}`,
    stem: 'Explain the trade-off.',
    type: 'short_answer' as const,
    difficulty: 'medium' as const,
    tags: ['role:backend'],
    answer: 'A complete answer.',
    rubric: [{ point: 'trade-off', score: 10, description: 'Explains the trade-off.' }],
    sourceRefs: ['fixture://interview-review'],
    status: 'published' as const,
    createdAt: date,
    updatedAt: date,
  };
}

function sessionRecord(question: ReturnType<typeof questionRecord>) {
  const date = new Date('2026-07-27T00:00:00.000Z');
  return {
    id: 'review-session',
    tenantId: context.tenantId,
    userId: context.actor.id,
    jobIntentId: null,
    sourceInterviewSessionId: 'interview-1',
    mode: 'interview_review' as const,
    title: '面试专项回练',
    status: 'in_progress' as const,
    startedAt: date,
    submittedAt: null,
    reportedAt: null,
    createdAt: date,
    updatedAt: date,
    items: [
      {
        id: 'review-item',
        tenantId: context.tenantId,
        sessionId: 'review-session',
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
