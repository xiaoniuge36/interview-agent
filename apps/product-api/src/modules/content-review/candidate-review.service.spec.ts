import type { ProductRequestContext } from '../../common/context/request-context';
import type { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CandidateReviewService } from './candidate-review.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'admin-1',
    subject: 'admin-1',
    tenantId: 'tenant-1',
    role: 'admin',
    scopes: ['candidate:review', 'question:write'],
  },
};

describe('CandidateReviewService', () => {
  it('loads an already published question through the candidate tenant key', async () => {
    const database = candidateDatabase();
    database.transaction.candidateQuestion.findFirst.mockResolvedValue({
      id: 'candidate-1',
      tenantId: context.tenantId,
      status: 'approved',
      publishedQuestionId: 'question-1',
    });
    database.transaction.question.findUnique.mockResolvedValue(publishedQuestion());
    const service = new CandidateReviewService(
      database as unknown as PrismaService,
      new PolicyService(),
      { record: jest.fn().mockResolvedValue({}) } as unknown as AuditService,
    );

    await expect(
      service.publish(context, 'candidate-1', { visibility: 'tenant' }),
    ).resolves.toEqual(publishedQuestion());

    expect(database.transaction.question.findUnique).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: context.tenantId, id: 'question-1' } },
    });
    expect(database.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.any(Object));
  });

  it('rejects publish calls from a non-admin reviewer', async () => {
    const database = candidateDatabase();
    const service = new CandidateReviewService(
      database as unknown as PrismaService,
      new PolicyService(),
      { record: jest.fn().mockResolvedValue({}) } as unknown as AuditService,
    );
    const reviewerContext: ProductRequestContext = {
      ...context,
      actor: { ...context.actor, role: 'question_reviewer' },
    };

    await expect(
      service.publish(reviewerContext, 'candidate-1', { visibility: 'tenant' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it('returns a Chinese prompt when a pending candidate is sent to publish', () =>
    expectPendingPublishPrompt());

  it('increments the persisted revision before recording an approval transition', () =>
    expectPersistedRevisionAudit());
  it('reviews same-source candidates atomically and records every transition', () =>
    expectBatchReview());
  it('rejects batch reviews that mix import sources before writing', () =>
    expectMixedSourceBatchRejected());
  it('rejects batch reviews that include published candidates before writing', () =>
    expectPublishedBatchRejected());
});

describe('CandidateReviewService platform access', () => {
  it('allows a platform administrator to publish an approved candidate', async () => {
    const database = candidateDatabase();
    database.transaction.candidateQuestion.findFirst.mockResolvedValue(
      candidateRecord({ status: 'approved' }),
    );
    database.transaction.question.findFirst.mockResolvedValue(null);
    database.transaction.question.create.mockResolvedValue(publishedQuestion());
    const service = new CandidateReviewService(
      database as unknown as PrismaService,
      new PolicyService(),
      { record: jest.fn().mockResolvedValue({}) } as unknown as AuditService,
    );
    const platformContext: ProductRequestContext = {
      ...context,
      actor: { ...context.actor, role: 'platform_admin' },
    };

    await expect(
      service.publish(platformContext, 'candidate-1', { visibility: 'tenant' }),
    ).resolves.toEqual(publishedQuestion());
  });
});

function candidateDatabase() {
  const transaction = {
    candidateQuestion: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    question: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
  };
  return {
    transaction,
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };
}

async function expectPendingPublishPrompt() {
  const database = candidateDatabase();
  database.transaction.candidateQuestion.findFirst.mockResolvedValue(candidateRecord());
  const service = new CandidateReviewService(
    database as unknown as PrismaService,
    new PolicyService(),
    { record: jest.fn().mockResolvedValue({}) } as unknown as AuditService,
  );
  const error = await service.publish(context, 'candidate-1', { visibility: 'tenant' }).then(
    () => null,
    (reason: unknown) => reason,
  );

  expect(error).toBeInstanceOf(BadRequestException);
  expect((error as BadRequestException).getResponse()).toMatchObject({
    code: 'CANDIDATE_NOT_APPROVED',
    message: '候选题审核通过后才能发布。',
  });
}

async function expectPersistedRevisionAudit() {
  const database = candidateDatabase();
  const audit = { record: jest.fn().mockResolvedValue({}) };
  database.transaction.candidateQuestion.findFirst.mockResolvedValue(candidateRecord());
  database.transaction.candidateQuestion.update.mockResolvedValue(
    candidateRecord({ status: 'approved', revision: 2 }),
  );
  const service = new CandidateReviewService(
    database as unknown as PrismaService,
    new PolicyService(),
    audit as unknown as AuditService,
  );

  await service.update(context, 'candidate-1', { status: 'approved' });

  expect(database.transaction.candidateQuestion.update).toHaveBeenCalledWith({
    where: { id: 'candidate-1' },
    data: { status: 'approved', revision: { increment: 1 } },
  });
  expect(audit.record).toHaveBeenCalledWith(
    context,
    expect.objectContaining({
      stateTransition: { from: 'pending', to: 'approved', version: 2 },
    }),
    database.transaction,
  );
}

type BatchReviewService = {
  batchReview: (
    context: ProductRequestContext,
    input: { candidateIds: string[]; status: 'approved'; reviewNotes: string | null },
  ) => Promise<{ updatedCount: number }>;
};

async function expectBatchReview() {
  const database = candidateDatabase();
  const audit = { record: jest.fn().mockResolvedValue({}) };
  database.transaction.candidateQuestion.findMany.mockResolvedValue([
    candidateRecord({ id: 'candidate-1', importTaskId: 'import-1', revision: 1 }),
    candidateRecord({ id: 'candidate-2', importTaskId: 'import-1', revision: 3 }),
  ]);
  database.transaction.candidateQuestion.update
    .mockResolvedValueOnce(candidateRecord({ id: 'candidate-1', status: 'approved', revision: 2 }))
    .mockResolvedValueOnce(candidateRecord({ id: 'candidate-2', status: 'approved', revision: 4 }));
  const service = new CandidateReviewService(
    database as unknown as PrismaService,
    new PolicyService(),
    audit as unknown as AuditService,
  ) as unknown as BatchReviewService;

  await expect(
    service.batchReview(context, {
      candidateIds: ['candidate-1', 'candidate-2'],
      status: 'approved',
      reviewNotes: '内容准确。',
    }),
  ).resolves.toEqual({ updatedCount: 2 });

  expect(database.transaction.candidateQuestion.update).toHaveBeenCalledWith({
    where: { id: 'candidate-1' },
    data: { status: 'approved', reviewNotes: '内容准确。', revision: { increment: 1 } },
  });
  expect(audit.record).toHaveBeenCalledTimes(2);
}

async function expectMixedSourceBatchRejected() {
  const database = candidateDatabase();
  database.transaction.candidateQuestion.findMany.mockResolvedValue([
    candidateRecord({ id: 'candidate-1', importTaskId: 'import-1' }),
    candidateRecord({ id: 'candidate-2', importTaskId: 'import-2' }),
  ]);
  const service = new CandidateReviewService(
    database as unknown as PrismaService,
    new PolicyService(),
    { record: jest.fn().mockResolvedValue({}) } as unknown as AuditService,
  ) as unknown as BatchReviewService;

  await expect(
    service.batchReview(context, {
      candidateIds: ['candidate-1', 'candidate-2'],
      status: 'approved',
      reviewNotes: null,
    }),
  ).rejects.toBeInstanceOf(BadRequestException);
  expect(database.transaction.candidateQuestion.update).not.toHaveBeenCalled();
}

async function expectPublishedBatchRejected() {
  const database = candidateDatabase();
  database.transaction.candidateQuestion.findMany.mockResolvedValue([
    candidateRecord({
      id: 'candidate-1',
      importTaskId: 'import-1',
      publishedQuestionId: 'question-1',
    }),
  ]);
  const service = new CandidateReviewService(
    database as unknown as PrismaService,
    new PolicyService(),
    { record: jest.fn().mockResolvedValue({}) } as unknown as AuditService,
  ) as unknown as BatchReviewService;

  const error = await service
    .batchReview(context, {
      candidateIds: ['candidate-1'],
      status: 'approved',
      reviewNotes: null,
    })
    .then(
      () => null,
      (reason: unknown) => reason,
    );

  expect(error).toBeInstanceOf(ConflictException);
  expect((error as ConflictException).getResponse()).toMatchObject({
    code: 'CANDIDATE_ALREADY_PUBLISHED',
    message: '候选题已发布到题库，不能再编辑。',
  });
  expect(database.transaction.candidateQuestion.update).not.toHaveBeenCalled();
}

function publishedQuestion() {
  return {
    id: 'question-1',
    tenantId: context.tenantId,
    visibility: 'tenant',
    title: 'Published question',
    stem: 'Explain the publication boundary.',
    type: 'short_answer',
    difficulty: 'easy',
    tags: ['governance'],
    answer: 'Published questions must preserve tenant scope.',
    rubric: [{ point: 'tenant', score: 10, description: 'Mentions tenant scope.' }],
    sourceRefs: ['fixture://published-question'],
    status: 'published',
  };
}

function candidateRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'candidate-1',
    tenantId: context.tenantId,
    importTaskId: null,
    publishedQuestionId: null,
    title: 'Candidate question',
    stem: 'Explain revision handling.',
    type: 'short_answer',
    difficulty: 'easy',
    answer: 'Persist the revision before auditing the state transition.',
    rubric: [{ point: 'revision', score: 10, description: 'Uses a persisted revision.' }],
    status: 'pending',
    qualityScore: 1,
    tags: ['audit'],
    sourceRefs: ['fixture://candidate-revision'],
    reviewNotes: null,
    revision: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}
