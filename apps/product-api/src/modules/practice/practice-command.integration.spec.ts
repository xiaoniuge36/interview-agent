import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { PracticeCommandService } from './practice-command.service';

const describeDatabase = process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;
const suffix = randomUUID();
const tenantId = `practice-tenant-${suffix}`;
const userId = `practice-user-${suffix}`;
const questionId = `practice-question-${suffix}`;
const replaySessionId = `practice-replay-${suffix}`;
const parallelSessionIds = [`practice-parallel-a-${suffix}`, `practice-parallel-b-${suffix}`];
const closedSessionId = `practice-closed-${suffix}`;

const prisma = new PrismaService();
const commands = new PracticeCommandService(prisma, new PolicyService(), new AuditService(prisma));

const context: ProductRequestContext = {
  requestId: `request-${suffix}`,
  traceId: `trace-${suffix}`,
  tenantId,
  actor: {
    id: userId,
    subject: userId,
    tenantId,
    role: 'user',
    scopes: ['practice:submit', 'practice:answer'],
  },
};

describeDatabase('PracticeCommandService database integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await seedRecords();
  });

  afterAll(async () => {
    await cleanupRecords();
    await prisma.$disconnect();
  });

  it('returns one persisted report when the same session is submitted twice', async () => {
    const results = await Promise.allSettled([
      commands.submit(context, replaySessionId),
      commands.submit(context, replaySessionId),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
    expect(await prisma.practiceReport.count({ where: { sessionId: replaySessionId } })).toBe(1);
    expect(await prisma.evaluationResult.count({ where: { tenantId } })).toBe(1);
  });

  it('does not lose mastery evidence when sessions with the same tag submit concurrently', async () => {
    await Promise.all(parallelSessionIds.map((sessionId) => commands.submit(context, sessionId)));

    const mastery = await prisma.masteryProfile.findUniqueOrThrow({
      where: { tenantId_userId_tag: { tenantId, userId, tag: 'system-design' } },
    });

    expect(mastery.evidenceCount).toBe(3);
  });

  it('rejects a delayed answer after a report has been generated', async () => {
    await commands.submit(context, closedSessionId);

    try {
      await commands.submitAnswer({
        context,
        sessionId: closedSessionId,
        itemId: itemIdFor(closedSessionId),
        input: { answer: 'late answer' },
      });
      throw new Error('Expected delayed answer to be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: 'PRACTICE_SESSION_CLOSED',
      });
    }
  });
});

async function seedRecords() {
  await prisma.tenant.create({ data: { id: tenantId, slug: tenantId, name: tenantId } });
  await prisma.user.create({
    data: { id: userId, tenantId, subject: userId, role: 'user' },
  });
  await prisma.question.create({
    data: {
      id: questionId,
      tenantId,
      visibility: 'tenant',
      title: 'Practice transaction question',
      stem: 'Explain the transaction boundary.',
      type: 'system_design',
      difficulty: 'medium',
      tags: ['system-design'],
      answer: 'Use a serializable transaction and an explicit state transition.',
      rubric: [
        { point: 'transaction', score: 5, description: 'Explains transaction scope.' },
        { point: 'state', score: 5, description: 'Explains state transitions.' },
      ],
      sourceRefs: ['fixture://practice-transaction'],
      status: 'published',
    },
  });
  await Promise.all(
    [replaySessionId, ...parallelSessionIds, closedSessionId].map((sessionId) =>
      seedSession(sessionId),
    ),
  );
}

async function seedSession(sessionId: string) {
  await prisma.practiceSession.create({
    data: {
      id: sessionId,
      tenantId,
      userId,
      mode: 'manual',
      title: `Practice ${sessionId}`,
      status: 'in_progress',
    },
  });
  await prisma.practiceSessionItem.create({
    data: {
      id: itemIdFor(sessionId),
      tenantId,
      sessionId,
      questionTenantId: tenantId,
      questionId,
      sequence: 1,
      status: 'answered',
      answer: 'Use a serializable transaction and explicit state transition.',
      answeredAt: new Date(),
    },
  });
}

function itemIdFor(sessionId: string) {
  return `practice-item-${sessionId}`;
}

async function cleanupRecords() {
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.evaluationResult.deleteMany({ where: { tenantId } });
  await prisma.practiceReport.deleteMany({ where: { tenantId } });
  await prisma.masteryProfile.deleteMany({ where: { tenantId } });
  await prisma.practiceSessionItem.deleteMany({ where: { tenantId } });
  await prisma.practiceSession.deleteMany({ where: { tenantId } });
  await prisma.question.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
}
