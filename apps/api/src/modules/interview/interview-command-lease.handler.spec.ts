import { ConflictException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import type { ProductRequestContext } from '../../common/context/request-context';
import type { Environment } from '../../common/config/environment';
import { executionFingerprint } from './interview-command.errors';
import { InterviewCommandLeaseHandler } from './interview-command-lease.handler';
import type { ExecuteCommandRequest } from './interview.types';

const LEASE_MS = 30_000;

const context: ProductRequestContext = {
  requestId: 'request-test-0001',
  traceId: 'trace-test-0001',
  tenantId: 'tenant-a',
  actor: {
    id: 'user-a',
    subject: 'subject-a',
    tenantId: 'tenant-a',
    role: 'user',
    scopes: ['interview:advance'],
  },
};

const request = (idempotencyKey = 'advance-key-0001'): ExecuteCommandRequest => ({
  context,
  sessionId: 'session-1',
  command: 'advance',
  expectedVersion: 0,
  idempotencyKey,
  answer: undefined,
});

const sessionRecord = {
  id: 'session-1',
  tenantId: 'tenant-a',
  userId: 'user-a',
  jobIntentId: null,
  status: 'created' as const,
  stage: 'warmup' as const,
  version: 0,
  eventSequence: 0,
  workflowRunId: 'workflow-1',
  title: 'Agent 模拟面试',
  createdAt: new Date('2026-07-10T08:00:00.000Z'),
  updatedAt: new Date('2026-07-10T08:00:00.000Z'),
  turns: [],
};

function existingCommand(
  input: Partial<Prisma.InterviewCommandGetPayload<object>> = {},
): Prisma.InterviewCommandGetPayload<object> {
  const current = request();
  return {
    id: 'command-1',
    tenantId: 'tenant-a',
    sessionId: 'session-1',
    actorId: 'user-a',
    idempotencyKey: current.idempotencyKey,
    fingerprint: executionFingerprint(current),
    type: 'advance',
    expectedVersion: 0,
    status: 'pending',
    result: null,
    errorCode: null,
    traceId: 'trace-test-0001',
    attemptCount: 1,
    leaseExpiresAt: new Date(Date.now() - 1),
    createdAt: new Date('2026-07-10T08:00:00.000Z'),
    updatedAt: new Date('2026-07-10T08:00:00.000Z'),
    completedAt: null,
    ...input,
  };
}

function setup(existing: Prisma.InterviewCommandGetPayload<object> | null) {
  const transaction = {
    interviewCommand: {
      findUnique: jest.fn(async () => existing),
      create: jest.fn(async () => existing),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    interviewSession: { findFirst: jest.fn(async () => sessionRecord) },
    agentRun: {
      create: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
  };
  const config = { get: jest.fn(() => LEASE_MS) };
  const handler = new InterviewCommandLeaseHandler(
    config as unknown as ConfigService<Environment, true>,
  );
  return { handler, transaction };
}

describe('InterviewCommandLeaseHandler', () => {
  it('rejects an idempotency key reused with another fingerprint', async () => {
    const { handler, transaction } = setup(existingCommand({ fingerprint: 'different' }));

    await expect(
      handler.execute(transaction as unknown as Prisma.TransactionClient, request()),
    ).rejects.toMatchObject({ response: { code: 'IDEMPOTENCY_KEY_REUSED' } });
    expect(transaction.interviewSession.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a duplicate request while its lease is active', async () => {
    const futureLease = new Date(Date.now() + LEASE_MS);
    const { handler, transaction } = setup(existingCommand({ leaseExpiresAt: futureLease }));

    await expect(
      handler.execute(transaction as unknown as Prisma.TransactionClient, request()),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.interviewCommand.updateMany).not.toHaveBeenCalled();
  });

  it('reclaims an expired lease and records a new run attempt', async () => {
    const { handler, transaction } = setup(existingCommand());

    const result = await handler.execute(
      transaction as unknown as Prisma.TransactionClient,
      request(),
    );

    expect(result).toMatchObject({
      kind: 'invoke',
      commandId: 'command-1',
      attemptCount: 2,
      session: { id: 'session-1' },
    });
    expect(transaction.interviewCommand.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ attemptCount: { increment: 1 } }),
      }),
    );
    expect(transaction.agentRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'failed', error: 'INTERVIEW_COMMAND_LEASE_EXPIRED' },
      }),
    );
    expect(transaction.agentRun.create).toHaveBeenCalledTimes(1);
  });

  it('does not replay a command that previously failed', async () => {
    const failed = existingCommand({ status: 'failed', errorCode: 'AGENT_RUNTIME_UNAVAILABLE' });
    const { handler, transaction } = setup(failed);

    await expect(
      handler.execute(transaction as unknown as Prisma.TransactionClient, request()),
    ).rejects.toMatchObject({ response: { code: 'AGENT_RUNTIME_UNAVAILABLE' } });
    expect(transaction.interviewSession.findFirst).not.toHaveBeenCalled();
  });
});
