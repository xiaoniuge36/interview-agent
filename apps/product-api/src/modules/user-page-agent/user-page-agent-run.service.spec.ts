import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserPageAgentRunService } from './user-page-agent-run.service';

const context = {
  tenantId: 'tenant-1',
  actor: { id: 'user-1' },
  traceId: 'trace-1',
} as never;

it('returns the eight newest runs scoped to the current user conversation', async () => {
  const prisma = createPrisma();
  prisma.userAgentConversation.findFirst.mockResolvedValue({ id: 'conversation-1' });
  prisma.userPageAgentRun.findMany.mockResolvedValue([runRecord()]);
  prisma.userPageAgentRun.updateMany.mockResolvedValue({ count: 0 });
  const service = new UserPageAgentRunService(prisma as never);

  const result = await service.list(context, 'conversation-1');

  expect(prisma.userPageAgentRun.findMany).toHaveBeenCalledWith({
    where: { tenantId: 'tenant-1', userId: 'user-1', conversationId: 'conversation-1' },
    orderBy: { startedAt: 'desc' },
    take: 8,
  });
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ id: 'run-1', status: 'running' });
});

it('archives stale active runs before returning history', async () => {
  const prisma = createPrisma();
  prisma.userAgentConversation.findFirst.mockResolvedValue({ id: 'conversation-1' });
  prisma.userPageAgentRun.findMany.mockResolvedValue([]);
  prisma.userPageAgentRun.updateMany.mockResolvedValue({ count: 1 });
  const service = new UserPageAgentRunService(prisma as never);

  await service.list(context, 'conversation-1');

  expect(prisma.userPageAgentRun.updateMany).toHaveBeenCalledWith({
    where: expect.objectContaining({
      tenantId: 'tenant-1',
      userId: 'user-1',
      conversationId: 'conversation-1',
      status: { in: ['running', 'waiting_confirmation'] },
      heartbeatAt: { lt: expect.any(Date) },
    }),
    data: expect.objectContaining({
      status: 'interrupted',
      errorCode: 'HEARTBEAT_TIMEOUT',
    }),
  });
});

it('creates one idempotent sanitized run after verifying conversation ownership', async () => {
  const prisma = createPrisma();
  prisma.userAgentConversation.findFirst.mockResolvedValue({ id: 'conversation-1' });
  prisma.userPageAgentRun.findFirst.mockResolvedValue(null);
  prisma.userPageAgentRun.create.mockResolvedValue(runRecord({ prompt: 'token=[已隐藏]' }));
  const service = new UserPageAgentRunService(prisma as never);

  const result = await service.create(context, 'conversation-1', {
    prompt: '请分析 token=secret-value',
    clientRequestId: '11111111-1111-4111-8111-111111111111',
  });

  expect(prisma.userPageAgentRun.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      tenantId: 'tenant-1',
      userId: 'user-1',
      conversationId: 'conversation-1',
      clientRequestId: '11111111-1111-4111-8111-111111111111',
      prompt: '请分析 token=[已隐藏]',
      traceId: 'trace-1',
    }),
  });
  expect(result.prompt).toBe('token=[已隐藏]');
});

it('rejects retries that do not target a terminal run in the same conversation', async () => {
  const prisma = createPrisma();
  prisma.userAgentConversation.findFirst.mockResolvedValue({ id: 'conversation-1' });
  prisma.userPageAgentRun.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
  const service = new UserPageAgentRunService(prisma as never);

  await expect(
    service.create(context, 'conversation-1', {
      prompt: '重新给训练建议',
      clientRequestId: '11111111-1111-4111-8111-111111111111',
      retryOfRunId: 'run-old',
    }),
  ).rejects.toBeInstanceOf(NotFoundException);
});

it('updates heartbeat only while the run is active', async () => {
  const prisma = createPrisma();
  prisma.userPageAgentRun.findFirst
    .mockResolvedValueOnce(runRecord())
    .mockResolvedValueOnce(runRecord({ status: 'waiting_confirmation' }));
  prisma.userPageAgentRun.updateMany.mockResolvedValue({ count: 1 });
  const service = new UserPageAgentRunService(prisma as never);

  const result = await service.heartbeat(context, 'run-1', {
    status: 'waiting_confirmation',
    currentStep: '等待确认 token=secret-value',
    tokenCount: 23,
  });

  expect(prisma.userPageAgentRun.updateMany).toHaveBeenCalledWith({
    where: expect.objectContaining({
      id: 'run-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      status: { in: ['running', 'waiting_confirmation'] },
    }),
    data: expect.objectContaining({
      status: 'waiting_confirmation',
      currentStep: '等待确认 token=[已隐藏]',
      tokenCount: 23,
    }),
  });
  expect(result.status).toBe('waiting_confirmation');
});

it('completes a run once and rejects a later state transition', async () => {
  const prisma = createPrisma();
  prisma.userPageAgentRun.findFirst
    .mockResolvedValueOnce(runRecord())
    .mockResolvedValueOnce(runRecord({ status: 'cancelled' }))
    .mockResolvedValueOnce(runRecord({ status: 'cancelled' }));
  prisma.userPageAgentRun.updateMany.mockResolvedValue({ count: 1 });
  const service = new UserPageAgentRunService(prisma as never);

  const result = await service.complete(context, 'run-1', { status: 'cancelled' });
  await expect(service.heartbeat(context, 'run-1', { status: 'running' })).rejects.toBeInstanceOf(
    ConflictException,
  );

  expect(result.status).toBe('cancelled');
});
function createPrisma() {
  return {
    userAgentConversation: { findFirst: jest.fn() },
    userPageAgentRun: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
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

function runRecord(overrides: Partial<RunFixture> = {}): RunFixture {
  const now = new Date('2026-07-27T08:00:00.000Z');
  return {
    id: 'run-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    conversationId: 'conversation-1',
    retryOfRunId: null,
    clientRequestId: '11111111-1111-4111-8111-111111111111',
    prompt: '请给出训练建议',
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
    ...overrides,
  };
}
