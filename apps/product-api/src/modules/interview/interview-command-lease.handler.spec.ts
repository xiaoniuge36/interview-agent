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

const request = (
  idempotencyKey = 'advance-key-0001',
  sessionId = 'session-1',
  requestContext = context,
): ExecuteCommandRequest => ({
  context: requestContext,
  sessionId,
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

function setup(
  existing: Prisma.InterviewCommandGetPayload<object> | null,
  activeCommand: Prisma.InterviewCommandGetPayload<object> | null = null,
  options: { session?: typeof sessionRecord; isLocked?: boolean } = {},
) {
  const session = options.session ?? sessionRecord;
  const isLocked = options.isLocked ?? true;
  const transaction = {
    $queryRaw: jest.fn(async () => (isLocked ? [{ id: session.id }] : [])),
    interviewCommand: {
      findUnique: jest.fn(async () => existing),
      findFirst: jest.fn(async (input: unknown) => (void input, activeCommand)),
      create: jest.fn(async () => existing),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    interviewSession: { findFirst: jest.fn(async () => session) },
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

it('does not create a second run when another idempotency key owns the session lease', async () => {
  const activeLease = new Date(Date.now() + LEASE_MS);
  const active = existingCommand({
    id: 'command-active',
    idempotencyKey: 'advance-key-active',
    leaseExpiresAt: activeLease,
  });
  const { handler, transaction } = setup(null, active);

  await expect(
    handler.execute(
      transaction as unknown as Prisma.TransactionClient,
      request('advance-key-0002'),
    ),
  ).rejects.toMatchObject({ response: { code: 'INTERVIEW_COMMAND_IN_PROGRESS' } });

  expect(transaction.agentRun.create).not.toHaveBeenCalled();
  expect(transaction.interviewCommand.create).not.toHaveBeenCalled();
  expect(transaction.$queryRaw).toHaveBeenCalledTimes(1);
  const rawQueries = transaction.$queryRaw.mock.calls as unknown as Array<[unknown]>;
  const lockQuery = rawQueries[0]?.[0] as {
    strings: string[];
    values: unknown[];
  };
  expect(lockQuery.strings.join('?')).toContain('FROM "InterviewSession"');
  expect(lockQuery.strings.join('?')).toContain('FOR UPDATE');
  expect(lockQuery.values).toEqual(['session-1', 'tenant-a', 'user-a']);
  expect(transaction.interviewCommand.findFirst).toHaveBeenCalledWith({
    where: {
      tenantId: context.tenantId,
      sessionId: 'session-1',
      status: 'pending',
      leaseExpiresAt: { gt: expect.any(Date) },
    },
    select: { id: true },
  });
  const lockCall = transaction.$queryRaw.mock.invocationCallOrder[0];
  const activeCheckCall = transaction.interviewCommand.findFirst.mock.invocationCallOrder[0];
  expect(lockCall).toBeDefined();
  expect(activeCheckCall).toBeDefined();
  expect(lockCall!).toBeLessThan(activeCheckCall!);
});

it('serializes concurrent keys for one session into one agent invocation', async () => {
  const { handler } = setup(null);
  const shared = concurrentSetup();
  const outcomes = await Promise.allSettled([
    handler.execute(shared.transaction() as unknown as Prisma.TransactionClient, request('key-a')),
    handler.execute(shared.transaction() as unknown as Prisma.TransactionClient, request('key-b')),
  ]);

  expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
  expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
  expect(shared.agentCalls).toHaveLength(1);
  expect(shared.commands).toHaveLength(1);
});

it('does not block a separate session', async () => {
  const active = existingCommand({ leaseExpiresAt: new Date(Date.now() + LEASE_MS) });
  const session = { ...sessionRecord, id: 'session-2' };
  const { handler, transaction } = setup(null, active, { session });
  transaction.interviewCommand.findFirst.mockImplementation(async (input: unknown) => {
    const query = input as { where: { sessionId: string } };
    return query.where.sessionId === active.sessionId ? active : null;
  });

  await expect(
    handler.execute(
      transaction as unknown as Prisma.TransactionClient,
      request('advance-key-0002', 'session-2'),
    ),
  ).resolves.toMatchObject({ kind: 'invoke', sessionId: 'session-2' });
  expect(transaction.agentRun.create).toHaveBeenCalledTimes(1);
});
it('replays a completed command for the same idempotency key without another agent run', async () => {
  const completed = existingCommand({
    status: 'completed',
    result: {
      commandId: 'command-1',
      sessionId: 'session-1',
      sessionVersion: 0,
      eventCursor: 0,
      replayed: false,
      session: {
        ...sessionRecord,
        jobIntentId: undefined,
        createdAt: sessionRecord.createdAt.toISOString(),
        updatedAt: sessionRecord.updatedAt.toISOString(),
      },
    } as unknown as Prisma.JsonObject,
  });
  const { handler, transaction } = setup(completed);

  await expect(
    handler.execute(transaction as unknown as Prisma.TransactionClient, request()),
  ).resolves.toMatchObject({ kind: 'replay', result: { replayed: true } });
  expect(transaction.$queryRaw).not.toHaveBeenCalled();
  expect(transaction.agentRun.create).not.toHaveBeenCalled();
});

it("does not lock or create a command for another actor's session", async () => {
  const otherContext = { ...context, actor: { ...context.actor, id: 'user-b' } };
  const { handler, transaction } = setup(null, null, { isLocked: false });

  await expect(
    handler.execute(
      transaction as unknown as Prisma.TransactionClient,
      request('advance-key-0002', 'session-1', otherContext),
    ),
  ).rejects.toMatchObject({ status: 404 });
  expect(transaction.interviewCommand.findFirst).not.toHaveBeenCalled();
  expect(transaction.interviewCommand.create).not.toHaveBeenCalled();
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
function concurrentSetup() {
  const commands: Array<{ sessionId: string; leaseExpiresAt: Date }> = [];
  const agentCalls: string[] = [];
  let nextLock = Promise.resolve();
  const transaction = () => {
    let release: () => void = () => undefined;
    return {
      $queryRaw: jest.fn(async () => {
        const previousLock = nextLock;
        nextLock = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previousLock;
        return [{ id: 'session-1' }];
      }),
      interviewCommand: {
        findUnique: jest.fn(async () => null),
        findFirst: jest.fn(async () =>
          commands.some((command) => command.leaseExpiresAt.getTime() > Date.now())
            ? { id: 'command-active' }
            : null,
        ),
        create: jest.fn(async (input: { data: (typeof commands)[number] }) =>
          commands.push(input.data),
        ),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      interviewSession: { findFirst: jest.fn(async () => sessionRecord) },
      agentRun: {
        create: jest.fn(async () => {
          agentCalls.push('next');
          release();
        }),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
    };
  };
  return { transaction, commands, agentCalls };
}
