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
