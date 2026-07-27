import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminPageAgentRunService } from './admin-page-agent-run.service';

const context = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: { id: 'admin-1' },
} as never;

describe('AdminPageAgentRunService.create', () => {
  it('creates an owned run with the request trace and a sanitized prompt', async () => {
    const prisma = createPrisma();
    prisma.adminPageAgentConversation.findFirst.mockResolvedValue({ id: 'conversation-1' });
    prisma.adminPageAgentRun.findFirst.mockResolvedValue(null);
    prisma.adminPageAgentRun.create.mockResolvedValue(runRecord());
    const service = new AdminPageAgentRunService(prisma as never);

    const result = await service.create(context, 'conversation-1', {
      clientRequestId: 'client-request-1',
      prompt: '查询配置 apiKey=sk-secret-value-123456 联系 13812345678 a.person@example.com',
    });

    expect(prisma.adminPageAgentConversation.findFirst).toHaveBeenCalledWith({
      where: { id: 'conversation-1', tenantId: 'tenant-1', userId: 'admin-1' },
      select: { id: true },
    });
    expect(prisma.adminPageAgentRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        userId: 'admin-1',
        conversationId: 'conversation-1',
        clientRequestId: 'client-request-1',
        prompt: '查询配置 apiKey=[已隐藏] 联系 138****5678 a***@example.com',
        status: 'running',
        traceId: 'trace-1',
      }),
    });
    expect(result).not.toHaveProperty('tenantId');
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('clientRequestId');
  });

  it('returns the existing run for a repeated client request id', async () => {
    const prisma = createPrisma();
    prisma.adminPageAgentConversation.findFirst.mockResolvedValue({ id: 'conversation-1' });
    prisma.adminPageAgentRun.findFirst.mockResolvedValue(runRecord());
    const service = new AdminPageAgentRunService(prisma as never);

    const result = await service.create(context, 'conversation-1', {
      clientRequestId: 'client-request-1',
      prompt: '查询导入任务',
    });

    expect(result.id).toBe('run-1');
    expect(prisma.adminPageAgentRun.create).not.toHaveBeenCalled();
  });
});

describe('AdminPageAgentRunService retry creation', () => {
  it('rejects a retry target that is not an owned retryable run', async () => {
    const prisma = createPrisma();
    prisma.adminPageAgentConversation.findFirst.mockResolvedValue({ id: 'conversation-1' });
    prisma.adminPageAgentRun.findFirst.mockResolvedValue(null);
    const service = new AdminPageAgentRunService(prisma as never);

    await expect(
      service.create(context, 'conversation-1', {
        clientRequestId: 'client-request-2',
        prompt: '重新查询导入任务',
        retryOfRunId: 'run-outside-scope',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.adminPageAgentRun.create).not.toHaveBeenCalled();
  });
});

describe('AdminPageAgentRunService.latest', () => {
  it('reconciles stale active runs before returning the latest run', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-23T08:02:00.000Z'));
    const prisma = createPrisma();
    prisma.adminPageAgentConversation.findFirst.mockResolvedValue({ id: 'conversation-1' });
    prisma.adminPageAgentRun.updateMany.mockResolvedValue({ count: 1 });
    prisma.adminPageAgentRun.findFirst.mockResolvedValue(
      runRecord({
        status: 'interrupted',
        finishedAt: new Date('2026-07-23T08:02:00.000Z'),
      }),
    );
    const service = new AdminPageAgentRunService(prisma as never);

    const result = await service.latest(context, 'conversation-1');

    expect(prisma.adminPageAgentRun.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        userId: 'admin-1',
        conversationId: 'conversation-1',
        status: { in: ['running', 'waiting_confirmation'] },
        heartbeatAt: { lt: new Date('2026-07-23T08:00:30.000Z') },
      },
      data: expect.objectContaining({
        status: 'interrupted',
        errorCode: 'HEARTBEAT_TIMEOUT',
      }),
    });
    expect(result?.status).toBe('interrupted');
    jest.useRealTimers();
  });
});

describe('AdminPageAgentRunService.list', () => {
  it('returns the newest bounded history after reconciling stale owned runs', async () => {
    const prisma = createPrisma();
    prisma.adminPageAgentConversation.findFirst.mockResolvedValue({ id: 'conversation-1' });
    prisma.adminPageAgentRun.updateMany.mockResolvedValue({ count: 0 });
    prisma.adminPageAgentRun.findMany.mockResolvedValue([
      runRecord({ id: 'run-new' }),
      runRecord({ id: 'run-old' }),
    ]);
    const service = new AdminPageAgentRunService(prisma as never);

    const result = await service.list(context, 'conversation-1');

    expect(prisma.adminPageAgentRun.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', userId: 'admin-1', conversationId: 'conversation-1' },
      orderBy: { startedAt: 'desc' },
      take: 8,
    });
    expect(result.map((run) => run.id)).toEqual(['run-new', 'run-old']);
  });
});

describe('AdminPageAgentRunService.heartbeat', () => {
  it('rejects a heartbeat for a terminal run', async () => {
    const prisma = createPrisma();
    prisma.adminPageAgentRun.findFirst.mockResolvedValue(runRecord({ status: 'failed' }));
    const service = new AdminPageAgentRunService(prisma as never);

    await expect(
      service.heartbeat(context, 'run-1', { status: 'running', currentStep: '继续执行' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.adminPageAgentRun.updateMany).not.toHaveBeenCalled();
  });
});

describe('AdminPageAgentRunService.complete', () => {
  it('returns an already-completed run when the terminal status is repeated', async () => {
    const prisma = createPrisma();
    prisma.adminPageAgentRun.findFirst.mockResolvedValue(runRecord({ status: 'succeeded' }));
    const service = new AdminPageAgentRunService(prisma as never);

    const result = await service.complete(context, 'run-1', { status: 'succeeded' });

    expect(result.status).toBe('succeeded');
    expect(prisma.adminPageAgentRun.updateMany).not.toHaveBeenCalled();
  });

  it('atomically completes an active run and sanitizes its error summary', async () => {
    const prisma = createPrisma();
    prisma.adminPageAgentRun.findFirst.mockResolvedValueOnce(runRecord()).mockResolvedValueOnce(
      runRecord({
        status: 'failed',
        errorCode: 'AGENT_EXECUTION_FAILED',
        errorSummary: 'token=[已隐藏]',
      }),
    );
    prisma.adminPageAgentRun.updateMany.mockResolvedValue({ count: 1 });
    const service = new AdminPageAgentRunService(prisma as never);

    const result = await service.complete(context, 'run-1', {
      status: 'failed',
      errorCode: 'AGENT_EXECUTION_FAILED',
      errorSummary: 'token=secret-value',
    });

    expect(prisma.adminPageAgentRun.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'run-1',
        tenantId: 'tenant-1',
        userId: 'admin-1',
        status: { in: ['running', 'waiting_confirmation'] },
      }),
      data: expect.objectContaining({
        status: 'failed',
        errorCode: 'AGENT_EXECUTION_FAILED',
        errorSummary: 'token=[已隐藏]',
      }),
    });
    expect(result.status).toBe('failed');
  });
});

function createPrisma() {
  return {
    adminPageAgentConversation: { findFirst: jest.fn() },
    adminPageAgentRun: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

type RunFixture = {
  id: string;
  tenantId: string;
  userId: string;
  conversationId: string;
  retryOfRunId: string | null;
  clientRequestId: string;
  prompt: string;
  status: 'running' | 'waiting_confirmation' | 'succeeded' | 'failed' | 'cancelled' | 'interrupted';
  currentStep: string | null;
  tokenCount: number;
  traceId: string;
  errorCode: string | null;
  errorSummary: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  heartbeatAt: Date;
  updatedAt: Date;
};

function runRecord(overrides: Partial<RunFixture> = {}) {
  return { ...baseRunRecord(), ...overrides };
}

function baseRunRecord(): RunFixture {
  const now = new Date('2026-07-23T08:00:00.000Z');
  return {
    id: 'run-1',
    tenantId: 'tenant-1',
    userId: 'admin-1',
    conversationId: 'conversation-1',
    retryOfRunId: null,
    clientRequestId: 'client-request-1',
    prompt: '查询配置 apiKey=[已隐藏] 联系 138****5678 a***@example.com',
    status: 'running',
    currentStep: null,
    tokenCount: 0,
    traceId: 'trace-1',
    errorCode: null,
    errorSummary: null,
    startedAt: now,
    finishedAt: null,
    heartbeatAt: now,
    updatedAt: now,
  };
}
