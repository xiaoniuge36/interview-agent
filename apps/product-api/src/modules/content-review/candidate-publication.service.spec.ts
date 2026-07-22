import { BadRequestException } from '@nestjs/common';
import type { ProductRequestContext } from '../../common/context/request-context';
import type { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
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

describe('CandidateReviewService batch publishing', () => {
  it('publishes approved candidates atomically and counts idempotent rows', () =>
    expectBatchPublish());
  it('rejects a batch before writing when any candidate is not approved', () =>
    expectBatchPublishRequiresApproval());
});

async function expectBatchPublish() {
  const database = candidateDatabase();
  const audit = { record: jest.fn().mockResolvedValue({}) };
  database.transaction.candidateQuestion.findMany.mockResolvedValue([
    candidateRecord({ id: 'candidate-1', status: 'approved' }),
    candidateRecord({
      id: 'candidate-2',
      status: 'approved',
      publishedQuestionId: 'question-existing',
    }),
  ]);
  database.transaction.question.findFirst.mockResolvedValue(null);
  database.transaction.question.create.mockResolvedValue(publishedQuestion());
  database.transaction.question.findUnique.mockResolvedValue(publishedQuestion());
  const service = new CandidateReviewService(
    database as unknown as PrismaService,
    new PolicyService(),
    audit as unknown as AuditService,
  );

  await expect(
    service.batchPublish(context, {
      candidateIds: ['candidate-1', 'candidate-2'],
      visibility: 'tenant',
    }),
  ).resolves.toEqual({ publishedCount: 1, alreadyPublishedCount: 1 });

  expect(database.transaction.candidateQuestion.update).toHaveBeenCalledWith({
    where: { id: 'candidate-1' },
    data: { publishedQuestionId: 'question-1' },
  });
  expect(audit.record).toHaveBeenCalledTimes(1);
}

async function expectBatchPublishRequiresApproval() {
  const database = candidateDatabase();
  database.transaction.candidateQuestion.findMany.mockResolvedValue([
    candidateRecord({ id: 'candidate-1', status: 'approved' }),
    candidateRecord({ id: 'candidate-2', status: 'pending' }),
  ]);
  const service = new CandidateReviewService(
    database as unknown as PrismaService,
    new PolicyService(),
    { record: jest.fn().mockResolvedValue({}) } as unknown as AuditService,
  );

  await expect(
    service.batchPublish(context, {
      candidateIds: ['candidate-1', 'candidate-2'],
      visibility: 'tenant',
    }),
  ).rejects.toBeInstanceOf(BadRequestException);

  expect(database.transaction.question.create).not.toHaveBeenCalled();
  expect(database.transaction.candidateQuestion.update).not.toHaveBeenCalled();
}

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
