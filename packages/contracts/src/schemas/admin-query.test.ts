import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import * as contracts from '../index';

const validQuestion = {
  id: 'question-1',
  tenantId: 'tenant-1',
  visibility: 'tenant' as const,
  title: 'Explain dependency injection',
  stem: 'Explain dependency injection and when it helps a service design.',
  type: 'short_answer' as const,
  difficulty: 'medium' as const,
  tags: ['architecture'],
  answer: 'Dependency injection supplies a dependency from outside the class.',
  rubric: [],
  sourceRefs: [],
  status: 'draft' as const,
};

const validCandidateReview = {
  id: 'candidate-1',
  title: 'Candidate question',
  status: 'pending' as const,
  qualityScore: 88,
  tags: ['backend'],
  sourceRefs: [],
  createdAt: '2026-07-15T00:00:00.000Z',
};

function getSchema(name: string): z.ZodTypeAny {
  const candidate = (contracts as Record<string, unknown>)[name];
  assert.ok(candidate instanceof z.ZodType, `${name} must be exported as a Zod schema`);
  return candidate;
}

function createPageSchema(itemSchema: z.ZodTypeAny): z.ZodTypeAny {
  const factory = (contracts as Record<string, unknown>).AdminPageSchema;
  assert.equal(typeof factory, 'function', 'AdminPageSchema must be exported as a schema factory');
  return (factory as (schema: z.ZodTypeAny) => z.ZodTypeAny)(itemSchema);
}

test('admin pagination query coerces URL values and applies safe defaults', () => {
  const parsed = getSchema('AdminPaginationQuerySchema').parse({
    page: '2',
    pageSize: '50',
    keyword: '  dependency injection  ',
  });

  assert.deepEqual(parsed, {
    page: 2,
    pageSize: 50,
    keyword: 'dependency injection',
  });
  assert.deepEqual(getSchema('AdminPaginationQuerySchema').parse({}), {
    page: 1,
    pageSize: 20,
  });
  assert.equal(getSchema('AdminPaginationQuerySchema').safeParse({ pageSize: 101 }).success, false);
});

test('import task query supports status filtering', () => {
  const parsed = getSchema('ImportTaskListQuerySchema').parse({ status: 'review' });
  assert.deepEqual(parsed, { page: 1, pageSize: 20, status: 'review' });
});

test('import tasks expose the detailed candidate review progress', () => {
  const task = {
    id: 'import-1',
    tenantId: 'tenant-1',
    assetId: 'asset-1',
    title: 'Java 面试资料.md',
    status: 'review',
    candidateCount: 6,
    candidateReviewProgress: {
      pending: 2,
      needsEdit: 1,
      approved: 1,
      rejected: 1,
      published: 1,
    },
    failureReason: null,
    createdAt: '2026-07-17T00:00:00.000Z',
    updatedAt: '2026-07-17T00:00:00.000Z',
  };

  assert.deepEqual(getSchema('ImportTaskSchema').parse(task), task);
  assert.equal(
    getSchema('ImportTaskSchema').safeParse({
      ...task,
      candidateReviewProgress: undefined,
    }).success,
    false,
  );
});

test('question query supports status and difficulty filtering', () => {
  const parsed = getSchema('QuestionListQuerySchema').parse({
    status: 'published',
    difficulty: 'hard',
  });
  assert.deepEqual(parsed, { page: 1, pageSize: 20, status: 'published', difficulty: 'hard' });
});

test('candidate query supports status and import task filtering', () => {
  const parsed = getSchema('CandidateReviewListQuerySchema').parse({
    status: 'needs_edit',
    importTaskId: 'import-1',
  });
  assert.deepEqual(parsed, {
    page: 1,
    pageSize: 20,
    status: 'needs_edit',
    importTaskId: 'import-1',
  });
});

test('model profile query supports status filtering', () => {
  const parsed = getSchema('ModelProfileListQuerySchema').parse({ status: 'standby' });
  assert.deepEqual(parsed, { page: 1, pageSize: 20, status: 'standby' });
});

test('agent run query supports status filtering', () => {
  const parsed = getSchema('AgentRunListQuerySchema').parse({ status: 'fallback' });
  assert.deepEqual(parsed, { page: 1, pageSize: 20, status: 'fallback' });
});

test('audit log query supports result filtering', () => {
  const parsed = getSchema('AuditLogListQuerySchema').parse({ result: 'failure' });
  assert.deepEqual(parsed, { page: 1, pageSize: 20, result: 'failure' });
});

test('platform dashboard contracts default the period and validate real aggregate metrics', () => {
  assert.deepEqual(getSchema('PlatformDashboardQuerySchema').parse({}), { period: '7d' });
  const dashboard = platformDashboard();

  assert.deepEqual(getSchema('PlatformDashboardSchema').parse(dashboard), dashboard);
  assert.equal(
    getSchema('PlatformDashboardSchema').safeParse({
      ...dashboard,
      runtime: { ...dashboard.runtime, successRate: 101 },
    }).success,
    false,
  );
});

function platformDashboard() {
  return {
    period: '7d',
    range: { startAt: '2026-07-09T00:00:00.000Z', endAt: '2026-07-16T00:00:00.000Z' },
    accounts: {
      total: 8,
      created: 3,
      active: 2,
      disabled: 1,
      tenants: 5,
      admin: 2,
      users: 6,
    },
    content: { imports: 4, pendingCandidates: 3, publishedQuestions: 7, failedImports: 1 },
    training: { interviews: 6, reports: 4, practiceSubmissions: 5, practiceReports: 3 },
    runtime: {
      runs: 10,
      successRate: 90,
      schemaPassRate: 80,
      averageLatencyMs: 342,
      fallbacks: 1,
      recentFailures: [],
    },
    trend: [
      {
        date: '2026-07-16',
        accountsCreated: 2,
        questionsPublished: 3,
        trainingCompleted: 4,
        agentRuns: 5,
      },
    ],
    funnel: {
      imports: 4,
      pendingCandidates: 3,
      publishedQuestions: 7,
      practiceSubmissions: 5,
      practiceReports: 3,
    },
    alerts: [{ code: 'review_backlog', severity: 'warning', count: 3 }],
  };
}

test('account governance contracts normalize filters and reject unmanaged roles', () => {
  assert.deepEqual(
    getSchema('AccountListQuerySchema').parse({
      keyword: '  Avery  ',
      kind: 'admin',
      role: 'platform_admin',
      status: 'disabled',
      authSource: 'local',
      tenantKeyword: '  system  ',
    }),
    {
      page: 1,
      pageSize: 20,
      keyword: 'Avery',
      kind: 'admin',
      role: 'platform_admin',
      status: 'disabled',
      authSource: 'local',
      tenantKeyword: 'system',
    },
  );
  assert.equal(
    getSchema('UpdateAccountRoleInputSchema').safeParse({ role: 'agent_runtime' }).success,
    false,
  );
  assert.equal(
    getSchema('ResetLocalPasswordInputSchema').safeParse({ password: '' }).success,
    false,
  );
});

test('admin page schema validates the item collection and metadata', () => {
  const schema = createPageSchema(contracts.QuestionSchema);
  const parsed = schema.parse({
    items: [validQuestion],
    total: 21,
    page: 2,
    pageSize: 20,
  });

  assert.deepEqual(parsed, {
    items: [validQuestion],
    total: 21,
    page: 2,
    pageSize: 20,
  });
  assert.equal(
    schema.safeParse({ items: [validQuestion], total: -1, page: 1, pageSize: 20 }).success,
    false,
  );
});

test('candidate review summaries retain the import task relation', () => {
  const candidateWithTask = {
    ...validCandidateReview,
    importTaskId: 'import-1',
    sourceImport: { id: 'import-1', title: 'Java 面试资料.md' },
  };
  const candidateWithoutTask = {
    ...validCandidateReview,
    importTaskId: null,
    sourceImport: null,
  };

  assert.deepEqual(contracts.CandidateReviewSchema.parse(candidateWithTask), candidateWithTask);
  assert.deepEqual(
    contracts.CandidateReviewSchema.parse(candidateWithoutTask),
    candidateWithoutTask,
  );
});

test('candidate review summaries expose the source import title for review context', () => {
  const parsed = contracts.CandidateReviewSchema.parse({
    ...validCandidateReview,
    importTaskId: 'import-1',
    sourceImport: { id: 'import-1', title: 'Java 面试资料.md' },
  });

  assert.deepEqual((parsed as { sourceImport?: unknown }).sourceImport, {
    id: 'import-1',
    title: 'Java 面试资料.md',
  });
  assert.deepEqual(
    contracts.CandidateReviewSchema.parse({
      ...validCandidateReview,
      importTaskId: null,
    }).sourceImport,
    null,
  );
});

test('batch candidate review accepts review outcomes and rejects pending or empty batches', () => {
  const schema = getSchema('BatchCandidateReviewInputSchema');
  assert.deepEqual(
    schema.parse({
      candidateIds: ['candidate-1', 'candidate-2'],
      status: 'approved',
      reviewNotes: '答案与原文一致。',
    }),
    {
      candidateIds: ['candidate-1', 'candidate-2'],
      status: 'approved',
      reviewNotes: '答案与原文一致。',
    },
  );
  assert.equal(
    schema.safeParse({ candidateIds: [], status: 'approved', reviewNotes: null }).success,
    false,
  );
  assert.equal(
    schema.safeParse({ candidateIds: ['candidate-1'], status: 'pending', reviewNotes: null })
      .success,
    false,
  );
  assert.equal(
    schema.safeParse({
      candidateIds: ['candidate-1', 'candidate-1'],
      status: 'approved',
      reviewNotes: null,
    }).success,
    false,
  );
});
