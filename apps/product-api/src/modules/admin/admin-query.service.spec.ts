import { ForbiddenException } from '@nestjs/common';
import {
  AgentRunListQuerySchema,
  AuditLogListQuerySchema,
  CandidateReviewListQuerySchema,
  ModelProfileListQuerySchema,
  QuestionListQuerySchema,
} from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PolicyService } from '../../common/authz/policy.service';
import type { PrismaService } from '../../common/database/prisma.service';
import { AdminQueryService } from './admin-query.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'admin-1',
    subject: 'admin-1',
    tenantId: 'tenant-1',
    role: 'admin',
    scopes: ['question:read', 'candidate:review', 'model:manage', 'audit:read'],
  },
};

const exportCases = [
  [
    'candidates',
    (service: AdminQueryService) => service.exportCandidates(context, candidateQuery()),
  ],
  [
    'model profiles',
    (service: AdminQueryService) => service.exportModelProfiles(context, modelQuery()),
  ],
  ['agent runs', (service: AdminQueryService) => service.exportAgentRuns(context, agentQuery())],
  ['audit logs', (service: AdminQueryService) => service.exportAuditLogs(context, auditQuery())],
] as const;

describe('AdminQueryService', () => {
  it('pages questions using public read scope, keyword, and filters', expectQuestionPage);
  it('pages import-linked candidate summaries with a tenant scope', expectCandidatePage);
  it('rejects a reviewer before a model profile query reaches Prisma', expectModelPermission);
  it(
    'uses resource-specific filters for model profiles, agent runs, and audit logs',
    expectResourceFilters,
  );
  it(
    'exports matching rows without a page offset, caps output, and audits the export',
    expectQuestionExport,
  );
  it.each(exportCases)('exports %s with the shared row cap', expectCappedExport);
});
async function expectQuestionPage() {
  const { service, prisma, policy } = createService();
  prisma.question.count.mockResolvedValue(31);
  prisma.question.findMany.mockResolvedValue([questionRecord()]);
  const query = QuestionListQuerySchema.parse({
    page: 2,
    pageSize: 20,
    keyword: 'retrieval',
    status: 'published',
    difficulty: 'hard',
  });
  const result = await service.queryQuestions(context, query);
  const where = questionWhere('retrieval', 'published', 'hard');

  expect(policy.assert).toHaveBeenCalledWith(context.actor, 'question:read', {
    tenantId: context.tenantId,
  });
  expect(prisma.question.count).toHaveBeenCalledWith({ where });
  expect(prisma.question.findMany).toHaveBeenCalledWith({
    where,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    skip: 20,
    take: 20,
  });
  expect(result).toEqual({ items: [questionRecord()], total: 31, page: 2, pageSize: 20 });
}
async function expectCandidatePage() {
  const { service, prisma, policy } = createService();
  prisma.candidateQuestion.count.mockResolvedValue(1);
  prisma.candidateQuestion.findMany.mockResolvedValue([
    candidateRecord({ importTask: { id: 'import-1', title: 'Java 面试资料.md' } }),
  ]);
  const query = CandidateReviewListQuerySchema.parse({
    keyword: 'schema',
    status: 'pending',
    importTaskId: 'import-1',
  });
  const where = {
    tenantId: context.tenantId,
    status: 'pending',
    importTaskId: 'import-1',
    OR: keywordWhere('schema', ['title', 'stem']),
  };

  await expect(service.queryCandidates(context, query)).resolves.toEqual({
    items: [
      {
        id: 'candidate-1',
        importTaskId: 'import-1',
        sourceImport: { id: 'import-1', title: 'Java 面试资料.md' },
        title: 'Schema candidate',
        status: 'pending',
        qualityScore: 88,
        tags: ['schema'],
        sourceRefs: ['fixture://candidate'],
        createdAt: '2026-07-15T10:00:00.000Z',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  });
  expect(policy.assert).toHaveBeenCalledWith(context.actor, 'candidate:review', {
    tenantId: context.tenantId,
  });
  expect(prisma.candidateQuestion.count).toHaveBeenCalledWith({ where });
  expect(prisma.candidateQuestion.findMany).toHaveBeenCalledWith({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: 0,
    take: 20,
    include: { importTask: { select: { id: true, title: true } } },
  });
}
async function expectModelPermission() {
  const { prisma, audit } = createService();
  const service = new AdminQueryService(
    prisma as unknown as PrismaService,
    new PolicyService(),
    audit as never,
  );
  const reviewer: ProductRequestContext = {
    ...context,
    actor: { ...context.actor, role: 'question_reviewer', scopes: ['question:read'] },
  };

  await expect(
    service.queryModelProfiles(reviewer, ModelProfileListQuerySchema.parse({})),
  ).rejects.toBeInstanceOf(ForbiddenException);
  expect(prisma.modelProfile.findMany).not.toHaveBeenCalled();
}
async function expectResourceFilters() {
  const { service, prisma } = createService();
  prisma.modelProfile.count.mockResolvedValue(0);
  prisma.modelProfile.findMany.mockResolvedValue([]);
  prisma.agentRun.count.mockResolvedValue(0);
  prisma.agentRun.findMany.mockResolvedValue([]);
  prisma.auditLog.count.mockResolvedValue(0);
  prisma.auditLog.findMany.mockResolvedValue([]);

  await Promise.all([
    service.queryModelProfiles(
      context,
      ModelProfileListQuerySchema.parse({ keyword: 'openai', status: 'active' }),
    ),
    service.queryAgentRuns(
      context,
      AgentRunListQuerySchema.parse({ keyword: 'trace-9', status: 'failed' }),
    ),
    service.queryAuditLogs(
      context,
      AuditLogListQuerySchema.parse({ keyword: 'candidate', result: 'failure' }),
    ),
  ]);

  expect(prisma.modelProfile.count).toHaveBeenCalledWith({
    where: {
      tenantId: context.tenantId,
      status: 'active',
      OR: keywordWhere('openai', ['provider', 'model', 'purpose']),
    },
  });
  expect(prisma.agentRun.count).toHaveBeenCalledWith({
    where: {
      tenantId: context.tenantId,
      status: 'failed',
      OR: keywordWhere('trace-9', ['stage', 'sessionId', 'traceId']),
    },
  });
  expect(prisma.auditLog.count).toHaveBeenCalledWith({
    where: {
      tenantId: context.tenantId,
      result: 'failure',
      OR: keywordWhere('candidate', ['action', 'resourceType', 'resourceId', 'actorId', 'traceId']),
    },
  });
}
async function expectQuestionExport() {
  const { service, prisma, audit } = createService();
  prisma.question.findMany.mockResolvedValue([questionRecord()]);
  const query = QuestionListQuerySchema.parse({
    page: 4,
    pageSize: 1,
    keyword: 'retrieval',
    status: 'published',
    difficulty: 'hard',
  });

  await expect(service.exportQuestions(context, query)).resolves.toEqual([questionRecord()]);
  expect(prisma.question.findMany).toHaveBeenCalledWith({
    where: questionWhere('retrieval', 'published', 'hard'),
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: 10_000,
  });
  expect(prisma.question.count).not.toHaveBeenCalled();
  expect(audit.record).toHaveBeenCalledWith(
    context,
    expect.objectContaining({
      action: 'admin:export',
      resourceType: 'AdminQuestionExport',
      metadata: { resource: 'questions', count: 1 },
    }),
  );
}
async function expectCappedExport(
  label: (typeof exportCases)[number][0],
  execute: (service: AdminQueryService) => Promise<unknown>,
) {
  const { service, prisma } = createService();
  const source = {
    candidates: prisma.candidateQuestion.findMany,
    'model profiles': prisma.modelProfile.findMany,
    'agent runs': prisma.agentRun.findMany,
    'audit logs': prisma.auditLog.findMany,
  }[label];
  source.mockResolvedValue([]);

  await execute(service);
  expect(source).toHaveBeenCalledWith(expect.objectContaining({ take: 10_000 }));
}
function createService() {
  const prisma = {
    question: { count: jest.fn(), findMany: jest.fn() },
    candidateQuestion: { count: jest.fn(), findMany: jest.fn() },
    modelProfile: { count: jest.fn(), findMany: jest.fn() },
    agentRun: { count: jest.fn(), findMany: jest.fn() },
    auditLog: { count: jest.fn(), findMany: jest.fn() },
  };
  const policy = { assert: jest.fn() };
  const audit = { record: jest.fn().mockResolvedValue({}) };
  return {
    service: new AdminQueryService(
      prisma as unknown as PrismaService,
      policy as never,
      audit as never,
    ),
    prisma,
    policy,
    audit,
  };
}
function questionWhere(keyword: string, status: 'published', difficulty: 'hard') {
  return {
    status,
    difficulty,
    AND: [
      { OR: [{ tenantId: context.tenantId }, { visibility: 'public' }] },
      { OR: keywordWhere(keyword, ['title', 'stem']) },
    ],
  };
}
function keywordWhere(keyword: string, fields: string[]) {
  return fields.map((field) => ({ [field]: { contains: keyword, mode: 'insensitive' } }));
}

function candidateQuery() {
  return CandidateReviewListQuerySchema.parse({});
}

function modelQuery() {
  return ModelProfileListQuerySchema.parse({});
}

function agentQuery() {
  return AgentRunListQuerySchema.parse({});
}

function auditQuery() {
  return AuditLogListQuerySchema.parse({});
}

function questionRecord() {
  return {
    id: 'question-1',
    tenantId: context.tenantId,
    visibility: 'tenant',
    title: 'Retrieval question',
    stem: 'Explain tenant-safe retrieval.',
    type: 'short_answer',
    difficulty: 'hard',
    tags: ['retrieval'],
    answer: 'Always scope data access by tenant.',
    rubric: [{ point: 'tenant', score: 10, description: 'Names the tenant boundary.' }],
    sourceRefs: ['fixture://question'],
    status: 'published',
  };
}

function candidateRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'candidate-1',
    importTaskId: 'import-1',
    title: 'Schema candidate',
    stem: 'Describe schema validation.',
    status: 'pending',
    qualityScore: 88,
    tags: ['schema'],
    sourceRefs: ['fixture://candidate'],
    createdAt: new Date('2026-07-15T10:00:00.000Z'),
    ...overrides,
  };
}
