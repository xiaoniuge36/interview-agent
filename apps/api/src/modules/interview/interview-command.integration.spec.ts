import type { InterviewSession } from '@interview-agent/contracts';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/database/prisma.service';
import { runSerializable } from '../../common/database/serializable-transaction';
import { InterviewCommandCompletionHandler } from './interview-command-completion.handler';
import { buildCompletion } from './interview-command.builder';
import type { CompleteCommandRequest, InvocationPreparation } from './interview.types';

const describeDatabase = process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;

const testId = randomUUID();
const tenantId = `tenant-${testId}`;
const userId = `user-${testId}`;
const sessionId = `session-${testId}`;
const commandIds = [`command-a-${testId}`, `command-b-${testId}`];
const runIds = [`run-a-${testId}`, `run-b-${testId}`];

const baseSession: InterviewSession = {
  id: sessionId,
  tenantId,
  userId,
  status: 'created',
  stage: 'warmup',
  version: 0,
  eventSequence: 0,
  workflowRunId: `workflow-${testId}`,
  title: '并发集成测试',
  turns: [],
  createdAt: '2026-07-10T08:00:00.000Z',
  updatedAt: '2026-07-10T08:00:00.000Z',
};

const prisma = new PrismaService();
const handler = new InterviewCommandCompletionHandler(new AuditService(prisma));

describeDatabase('Interview command database integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await seedRecords();
  });

  afterAll(async () => {
    await cleanupRecords();
    await prisma.$disconnect();
  });

  it('allows only one of two idempotency keys to commit the same session version', async () => {
    const requests = commandIds.map((commandId, index) =>
      completionRequest(commandId, runIds[index]!),
    );

    const outcomes = await Promise.allSettled(
      requests.map((request) =>
        runSerializable(prisma, (transaction) => handler.complete(transaction, request)),
      ),
    );

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
    const persisted = await prisma.interviewSession.findUniqueOrThrow({
      where: { tenantId_id: { tenantId, id: sessionId } },
    });
    expect(persisted.version).toBe(1);
  });
});

function completionRequest(commandId: string, runId: string): CompleteCommandRequest {
  const preparation: InvocationPreparation = {
    kind: 'invoke',
    context: {
      requestId: `request-${commandId}`,
      traceId: `trace-${commandId}`,
      tenantId,
      actor: {
        id: userId,
        subject: userId,
        tenantId,
        role: 'user',
        scopes: ['interview:advance'],
      },
    },
    sessionId,
    command: 'advance',
    expectedVersion: 0,
    idempotencyKey: `key-${commandId}`,
    answer: undefined,
    commandId,
    runId,
    attemptCount: 1,
    session: baseSession,
  };
  const runtime = {
    stage: 'warmup' as const,
    content: `并发问题 ${commandId}`,
    shouldFinish: false,
    latencyMs: 10,
    attempts: 1,
    fallbackUsed: false,
    schemaValid: true,
  };
  return { preparation, runtime, artifacts: buildCompletion({ preparation, runtime }) };
}

async function seedRecords() {
  await prisma.tenant.create({ data: { id: tenantId, slug: tenantId, name: tenantId } });
  await prisma.user.create({
    data: { id: userId, tenantId, subject: userId, role: 'user' },
  });
  await prisma.interviewSession.create({
    data: {
      id: sessionId,
      tenantId,
      userId,
      status: baseSession.status,
      stage: baseSession.stage,
      workflowRunId: baseSession.workflowRunId,
      title: baseSession.title,
    },
  });
  await Promise.all(commandIds.map((commandId, index) => seedCommand(commandId, runIds[index]!)));
}

async function seedCommand(commandId: string, runId: string) {
  await prisma.interviewCommand.create({
    data: {
      id: commandId,
      tenantId,
      sessionId,
      actorId: userId,
      idempotencyKey: `key-${commandId}`,
      fingerprint: commandId,
      type: 'advance',
      expectedVersion: 0,
      traceId: `trace-${commandId}`,
      attemptCount: 1,
      leaseExpiresAt: new Date(Date.now() + 60_000),
    },
  });
  await prisma.agentRun.create({
    data: {
      id: runId,
      tenantId,
      sessionId,
      commandId,
      type: 'mock_interview',
      status: 'running',
      stage: 'warmup',
      traceId: `trace-${commandId}`,
      attemptCount: 1,
    },
  });
}

async function cleanupRecords() {
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.interviewEvent.deleteMany({ where: { tenantId } });
  await prisma.interviewTurn.deleteMany({ where: { tenantId } });
  await prisma.agentRun.deleteMany({ where: { tenantId } });
  await prisma.interviewCommand.deleteMany({ where: { tenantId } });
  await prisma.interviewSession.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
}
