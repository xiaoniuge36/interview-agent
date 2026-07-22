import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AgentRuntimeNextRequestSchema,
  ActionSchema,
  CreateLocalAdminInputSchema,
  PlatformDashboardSchema,
  PracticeHistoryListSchema,
  QuestionSchema,
  RoleSchema,
  SubmitInterviewAnswerInputSchema,
  seedQuestions,
} from './index';

const validRuntimeRequest = {
  contractVersion: 'interview-runtime.v1',
  session: {
    id: 'session-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    status: 'running',
    stage: 'warmup',
    version: 0,
    title: 'Contract test',
    candidateTurnCount: 0,
    recentTurns: [],
  },
  commandId: 'command-1',
  traceId: 'trace-12345678',
};

test('all public question fixtures satisfy the shared contract', () => {
  assert.ok(seedQuestions.length > 0);
  for (const question of seedQuestions) {
    assert.deepEqual(QuestionSchema.parse(question), question);
  }
});

test('runtime requests reject unsupported contract versions', () => {
  const result = AgentRuntimeNextRequestSchema.safeParse({
    ...validRuntimeRequest,
    contractVersion: 'interview-runtime.v2',
  });
  assert.equal(result.success, false);
});

test('runtime requests preserve an optional signed model invocation grant', () => {
  const parsed = AgentRuntimeNextRequestSchema.parse({
    ...validRuntimeRequest,
    modelInvocationGrant: 'signed-runtime-grant.payload-signature',
  });

  assert.equal(parsed.modelInvocationGrant, 'signed-runtime-grant.payload-signature');
});

test('answer input trims content and rejects blank answers', () => {
  const parsed = SubmitInterviewAnswerInputSchema.parse({
    answer: '  structured answer  ',
    expectedVersion: 0,
  });
  assert.equal(parsed.answer, 'structured answer');
  assert.equal(
    SubmitInterviewAnswerInputSchema.safeParse({ answer: '   ', expectedVersion: 0 }).success,
    false,
  );
});

test('practice history only accepts compact training summaries', () => {
  assert.equal(
    PracticeHistoryListSchema.safeParse([
      {
        id: 'practice-1',
        title: 'System design review',
        mode: 'manual',
        status: 'report_ready',
        questionCount: 3,
        answeredCount: 3,
        evaluatedCount: 3,
        overallScore: 86,
        weaknesses: ['Explain trade-offs'],
        reportedAt: '2026-07-22T09:00:00.000Z',
        updatedAt: '2026-07-22T10:00:00.000Z',
      },
    ]).success,
    true,
  );
});

test('platform governance roles and scopes are part of the shared contract', () => {
  assert.equal(RoleSchema.parse('platform_admin'), 'platform_admin');
  assert.equal(ActionSchema.parse('analytics:read'), 'analytics:read');
  assert.equal(ActionSchema.parse('account:read'), 'account:read');
  assert.equal(ActionSchema.parse('account:write'), 'account:write');
});

test('local administrator creation normalizes email and enforces tenant assignment', () => {
  assert.deepEqual(
    CreateLocalAdminInputSchema.parse({
      name: '  Tenant Admin  ',
      email: 'TENANT.ADMIN@example.com',
      password: 'initial-password',
      role: 'admin',
      tenantSlug: '  demo  ',
    }),
    {
      name: 'Tenant Admin',
      email: 'tenant.admin@example.com',
      password: 'initial-password',
      role: 'admin',
      tenantSlug: 'demo',
    },
  );
  assert.equal(
    CreateLocalAdminInputSchema.safeParse({
      name: 'Tenant Admin',
      email: 'tenant.admin@example.com',
      password: 'initial-password',
      role: 'admin',
    }).success,
    false,
  );
  assert.equal(
    CreateLocalAdminInputSchema.safeParse({
      name: 'Platform Admin',
      email: 'platform.admin@example.com',
      password: 'initial-password',
      role: 'platform_admin',
      tenantSlug: 'system',
    }).success,
    false,
  );
});

test('platform dashboard requires operational trend, funnel, and alert data', () => {
  const dashboard = {
    period: '7d',
    range: { startAt: '2026-07-09T00:00:00.000Z', endAt: '2026-07-16T00:00:00.000Z' },
    accounts: { total: 8, created: 3, active: 2, disabled: 1, tenants: 5, admin: 2, users: 6 },
    content: { imports: 4, pendingCandidates: 3, publishedQuestions: 7, failedImports: 1 },
    training: { interviews: 6, reports: 4, practiceSubmissions: 5, practiceReports: 3 },
    runtime: {
      runs: 10,
      successRate: 80,
      schemaPassRate: 75,
      averageLatencyMs: 342,
      fallbacks: 1,
      recentFailures: [],
    },
  };

  assert.equal(PlatformDashboardSchema.safeParse(dashboard).success, false);
});
