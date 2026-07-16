import { ImportTaskListQuerySchema, type ImportTaskListQuery } from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { ImportService } from './import.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'reviewer-1',
    subject: 'reviewer-1',
    tenantId: 'tenant-1',
    role: 'question_reviewer',
    scopes: ['content:import'],
  },
};

describe('ImportService', () => {
  it('returns a tenant-scoped filtered page with stable ordering', () => expectFilteredPageQuery());

  it('returns the import source chunks for a tenant-scoped review task', () =>
    expectReviewContext());

  it('loads filtered export records without page offsets and caps the result at 10,000', async () => {
    const { service, prisma, policy, audit } = createService();
    prisma.importTask.findMany.mockResolvedValue([importTaskRecord()]);
    const query = parseQuery({ page: 4, pageSize: 1, keyword: 'pipeline', status: 'failed' });

    const result = await queryService(service).listForExport(context, query);

    const where = {
      tenantId: context.tenantId,
      status: 'failed',
      title: { contains: 'pipeline', mode: 'insensitive' },
    };
    expect(policy.assert).toHaveBeenCalledWith(context.actor, 'content:import', {
      tenantId: context.tenantId,
    });
    expect(prisma.importTask.count).not.toHaveBeenCalled();
    expect(prisma.importTask.findMany).toHaveBeenCalledWith({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 10_000,
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 'import-1',
        createdAt: '2026-07-15T10:00:00.000Z',
      }),
    ]);
    expect(audit.record).toHaveBeenCalledWith(context, {
      action: 'admin:export',
      resourceType: 'AdminImportExport',
      resourceId: context.requestId,
      metadata: { resource: 'imports', count: 1 },
    });
  });
});

async function expectFilteredPageQuery() {
  const { service, prisma, policy } = createService();
  prisma.importTask.count.mockResolvedValue(41);
  prisma.importTask.findMany.mockResolvedValue([importTaskRecord()]);
  const query = parseQuery({ page: 2, pageSize: 20, keyword: 'retrieval', status: 'review' });

  const result = await queryService(service).query(context, query);

  const where = {
    tenantId: context.tenantId,
    status: 'review',
    title: { contains: 'retrieval', mode: 'insensitive' },
  };
  expect(policy.assert).toHaveBeenCalledWith(context.actor, 'content:import', {
    tenantId: context.tenantId,
  });
  expect(prisma.importTask.count).toHaveBeenCalledWith({ where });
  expect(prisma.importTask.findMany).toHaveBeenCalledWith({
    where,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    skip: 20,
    take: 20,
  });
  expect(result).toEqual({
    items: [expect.objectContaining({ id: 'import-1', updatedAt: '2026-07-15T12:00:00.000Z' })],
    total: 41,
    page: 2,
    pageSize: 20,
  });
}

async function expectReviewContext() {
  const { service, prisma, policy } = createService();
  prisma.importTask.findFirst.mockResolvedValue(importTaskRecord());
  prisma.knowledgeChunk.findMany.mockResolvedValue([
    { content: 'Original source material', metadata: { sequence: 2 } },
  ]);

  const result = await reviewService(service).reviewContext(context, 'import-1');

  expect(policy.assert).toHaveBeenCalledWith(context.actor, 'content:import', {
    tenantId: context.tenantId,
  });
  expect(prisma.importTask.findFirst).toHaveBeenCalledWith({
    where: { id: 'import-1', tenantId: context.tenantId },
  });
  expect(prisma.knowledgeChunk.findMany).toHaveBeenCalledWith({
    where: { assetId: 'asset-1', tenantId: context.tenantId },
    select: { content: true, metadata: true },
    orderBy: { createdAt: 'asc' },
  });
  expect(result).toEqual({
    task: expect.objectContaining({ id: 'import-1', title: 'Retrieval import' }),
    sourceChunks: [{ sequence: 2, content: 'Original source material' }],
  });
}

function createService() {
  const prisma = {
    importTask: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    knowledgeChunk: {
      findMany: jest.fn(),
    },
  };
  const policy = { assert: jest.fn() };
  const audit = { record: jest.fn().mockResolvedValue({}) };
  const service = new ImportService(prisma as never, policy as never, audit as never);
  return { service, prisma, policy, audit };
}

function parseQuery(input: Partial<ImportTaskListQuery> = {}) {
  return ImportTaskListQuerySchema.parse(input);
}

function queryService(service: ImportService) {
  return service as unknown as {
    query(
      context: ProductRequestContext,
      query: ImportTaskListQuery,
    ): Promise<{
      items: Array<{ id: string; createdAt: string; updatedAt: string }>;
      total: number;
      page: number;
      pageSize: number;
    }>;
    listForExport(
      context: ProductRequestContext,
      query: ImportTaskListQuery,
    ): Promise<Array<{ id: string; createdAt: string; updatedAt: string }>>;
  };
}

function reviewService(service: ImportService) {
  return service as unknown as {
    reviewContext(
      context: ProductRequestContext,
      taskId: string,
    ): Promise<{
      task: { id: string; title: string };
      sourceChunks: Array<{ sequence: number; content: string }>;
    }>;
  };
}

function importTaskRecord() {
  return {
    id: 'import-1',
    tenantId: context.tenantId,
    assetId: 'asset-1',
    title: 'Retrieval import',
    status: 'review',
    candidateCount: 3,
    failureReason: null,
    createdAt: new Date('2026-07-15T10:00:00.000Z'),
    updatedAt: new Date('2026-07-15T12:00:00.000Z'),
  };
}
