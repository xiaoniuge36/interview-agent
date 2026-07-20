import { AgentRunListQuerySchema } from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
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
    scopes: ['audit:read'],
  },
};

describe('Admin Agent run query', () => {
  it('lets platform admins observe Agent runs across tenant boundaries', expectPlatformScope);
  it('enriches Agent runs with user context and aggregated model usage', expectRunDetails);
});

async function expectPlatformScope() {
  const { service, prisma } = createService();
  prisma.agentRun.count.mockResolvedValue(16);
  prisma.agentRun.findMany.mockResolvedValue([]);
  const platformContext: ProductRequestContext = {
    ...context,
    tenantId: 'system',
    actor: { ...context.actor, tenantId: 'system', role: 'platform_admin' },
  };

  await service.queryAgentRuns(platformContext, AgentRunListQuerySchema.parse({}));

  expect(prisma.agentRun.count).toHaveBeenCalledWith({ where: {} });
  expect(prisma.agentRun.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: {}, skip: 0, take: 20 }),
  );
}

async function expectRunDetails() {
  const { service, prisma } = createService();
  prisma.agentRun.count.mockResolvedValue(1);
  prisma.agentRun.findMany.mockResolvedValue([agentRunRecord()]);
  prisma.aiInvocation.findMany.mockResolvedValue([
    invocationRecord({ id: 'invocation-2', inputTokens: 300, outputTokens: 134, totalTokens: 434 }),
    invocationRecord({ id: 'invocation-1', inputTokens: 600, outputTokens: 200, totalTokens: 800 }),
  ]);

  const page = await service.queryAgentRuns(context, AgentRunListQuerySchema.parse({}));

  expect(page.items[0]).toEqual(expect.objectContaining(expectedRunDetails()));
  expect(prisma.aiInvocation.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        tenantId: { in: ['tenant-1'] },
        traceId: { in: ['trace-run-12345678'] },
      },
    }),
  );
}

function expectedRunDetails() {
  return {
    tenant: { id: 'tenant-1', name: 'Niu 的个人空间' },
    user: { id: 'user-1', name: 'Niu', email: 'niu@example.com' },
    sessionTitle: '全栈开发工程师面试训练',
    command: 'answer',
    modelUsage: {
      provider: 'openai_compatible',
      model: 'zai-org/GLM-5.2',
      invocationCount: 2,
      inputTokens: 900,
      outputTokens: 334,
      cacheReadTokens: 40,
      reasoningTokens: 60,
      totalTokens: 1234,
      latencyMs: 8400,
    },
  };
}

function createService() {
  const prisma = {
    agentRun: { count: jest.fn(), findMany: jest.fn() },
    aiInvocation: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return {
    service: new AdminQueryService(
      prisma as unknown as PrismaService,
      { assert: jest.fn() } as never,
      { record: jest.fn() } as never,
    ),
    prisma,
  };
}

function agentRunRecord() {
  return {
    id: 'run-1',
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    commandId: 'command-1',
    type: 'mock_interview',
    status: 'succeeded',
    stage: 'tech_basics',
    traceId: 'trace-run-12345678',
    input: null,
    output: null,
    error: null,
    latencyMs: 9126,
    schemaValid: true,
    fallbackUsed: false,
    attemptCount: 1,
    createdAt: new Date('2026-07-17T07:30:55.151Z'),
    updatedAt: new Date('2026-07-17T07:31:04.321Z'),
    tenant: { id: 'tenant-1', name: 'Niu 的个人空间' },
    session: {
      title: '全栈开发工程师面试训练',
      user: { id: 'user-1', name: 'Niu', email: 'niu@example.com' },
    },
    command: { type: 'answer' },
  };
}

function invocationRecord(overrides: Record<string, unknown>) {
  return {
    id: 'invocation-1',
    tenantId: 'tenant-1',
    traceId: 'trace-run-12345678',
    provider: 'openai_compatible',
    model: 'zai-org/GLM-5.2',
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 20,
    reasoningTokens: 30,
    totalTokens: 0,
    latencyMs: 4200,
    createdAt: new Date('2026-07-17T07:31:03.000Z'),
    ...overrides,
  };
}
