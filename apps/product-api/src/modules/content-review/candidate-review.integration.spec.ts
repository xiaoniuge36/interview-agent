import { randomUUID } from 'node:crypto';
import { AuditService } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { CandidateReviewService } from './candidate-review.service';

const describeDatabase = process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;
const suffix = randomUUID();
const tenantId = `candidate-tenant-${suffix}`;
const userId = `candidate-admin-${suffix}`;
const candidateId = `candidate-question-${suffix}`;
const title = `Concurrent candidate ${suffix}`;
const prisma = new PrismaService();
const service = new CandidateReviewService(prisma, new PolicyService(), new AuditService(prisma));
const context: ProductRequestContext = {
  requestId: `request-${suffix}`,
  traceId: `trace-${suffix}`,
  tenantId,
  actor: {
    id: userId,
    subject: userId,
    tenantId,
    role: 'admin',
    scopes: ['candidate:review', 'question:write'],
  },
};

describeDatabase('CandidateReviewService database integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await seedRecords();
  });

  afterAll(async () => {
    await prisma.candidateQuestion.deleteMany({ where: { tenantId } });
    await prisma.auditLog.deleteMany({ where: { tenantId } });
    await prisma.question.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  it('initializes a candidate revision with the database default', async () => {
    await expect(
      prisma.candidateQuestion.findUniqueOrThrow({ where: { id: candidateId } }),
    ).resolves.toMatchObject({ revision: 1 });
  });

  it('publishes one question when the same candidate is published concurrently', async () => {
    const [first, second] = await Promise.all([
      service.publish(context, candidateId, { visibility: 'tenant' }),
      service.publish(context, candidateId, { visibility: 'tenant' }),
    ]);

    expect(first.id).toBe(second.id);
    expect(await prisma.question.count({ where: { tenantId, title } })).toBe(1);
    await expect(
      prisma.candidateQuestion.findUniqueOrThrow({ where: { id: candidateId } }),
    ).resolves.toMatchObject({ publishedQuestionId: first.id });
  });
});

async function seedRecords() {
  await prisma.tenant.create({ data: { id: tenantId, slug: tenantId, name: tenantId } });
  await prisma.user.create({
    data: { id: userId, tenantId, subject: userId, role: 'admin' },
  });
  await prisma.candidateQuestion.create({
    data: {
      id: candidateId,
      tenantId,
      title,
      stem: 'Explain concurrent question publication.',
      type: 'short_answer',
      difficulty: 'easy',
      answer: 'A serializable transaction returns one published question.',
      rubric: [{ point: 'transaction', score: 10, description: 'Mentions serialization.' }],
      status: 'approved',
      qualityScore: 1,
      tags: ['concurrency'],
      sourceRefs: ['fixture://candidate-publication'],
    },
  });
}
