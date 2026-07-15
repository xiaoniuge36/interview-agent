import { PrismaService } from './prisma.service';

const describeDatabase = process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const consumerTenantId = `consumer-tenant-${suffix}`;
const sourceTenantId = `source-tenant-${suffix}`;
const consumerUserId = `consumer-user-${suffix}`;
const sourceUserId = `source-user-${suffix}`;
const sessionId = `practice-session-${suffix}`;
const questionId = `public-question-${suffix}`;
const privateQuestionId = `private-question-${suffix}`;
const assetId = `source-asset-${suffix}`;
const invalidImportTitle = `cross-tenant-asset-${suffix}`;

const prisma = new PrismaService();

describeDatabase('database tenant integrity', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await seedRecords();
  });

  afterAll(async () => {
    await cleanupRecords();
    await prisma.$disconnect();
  });

  it(
    'records the source tenant for a public question used by another tenant',
    recordPublicQuestionSource,
  );
  it('rejects a cross-tenant reference to a non-public question', rejectPrivateQuestionSource);
  it('prevents a referenced public question from becoming tenant-scoped', rejectQuestionDowngrade);
  it('rejects an import task that references another tenant asset', rejectForeignAssetImport);
  it('rejects a local credential whose tenant does not own its user', rejectForeignCredentialUser);
});

async function recordPublicQuestionSource() {
  const item = await prisma.practiceSessionItem.create({
    data: {
      tenantId: consumerTenantId,
      sessionId,
      questionTenantId: sourceTenantId,
      questionId,
      sequence: 1,
    },
  });

  expect(item.questionTenantId).toBe(sourceTenantId);
}

async function rejectPrivateQuestionSource() {
  await expect(
    prisma.practiceSessionItem.create({
      data: {
        tenantId: consumerTenantId,
        sessionId,
        questionTenantId: sourceTenantId,
        questionId: privateQuestionId,
        sequence: 2,
      },
    }),
  ).rejects.toThrow(
    'PracticeSessionItem cannot reference a non-public question from another tenant',
  );
}

async function rejectQuestionDowngrade() {
  await expect(
    prisma.question.update({
      where: { tenantId_id: { tenantId: sourceTenantId, id: questionId } },
      data: { visibility: 'tenant' },
    }),
  ).rejects.toThrow(
    'Question with cross-tenant practice references must remain public and published',
  );
}

async function rejectForeignAssetImport() {
  await expect(
    prisma.importTask.create({
      data: { tenantId: consumerTenantId, assetId, title: invalidImportTitle },
    }),
  ).rejects.toMatchObject({ code: 'P2003' });
}

async function rejectForeignCredentialUser() {
  await expect(
    prisma.localCredential.create({
      data: {
        tenantId: consumerTenantId,
        userId: sourceUserId,
        email: `cross-tenant-${suffix}@example.com`,
        passwordHash: 'hash',
      },
    }),
  ).rejects.toMatchObject({ code: 'P2003' });
}

async function seedRecords() {
  await seedTenantsAndUsers();
  await seedSourceQuestionAndAsset();
  await seedConsumerSession();
}

async function seedTenantsAndUsers() {
  await prisma.tenant.createMany({
    data: [
      { id: consumerTenantId, slug: consumerTenantId, name: consumerTenantId },
      { id: sourceTenantId, slug: sourceTenantId, name: sourceTenantId },
    ],
  });
  await prisma.user.createMany({
    data: [
      {
        id: consumerUserId,
        tenantId: consumerTenantId,
        subject: consumerUserId,
        role: 'user',
      },
      {
        id: sourceUserId,
        tenantId: sourceTenantId,
        subject: sourceUserId,
        role: 'user',
      },
    ],
  });
}

async function seedSourceQuestionAndAsset() {
  await prisma.question.create({
    data: {
      id: questionId,
      tenantId: sourceTenantId,
      visibility: 'public',
      title: 'Public source question',
      stem: 'Explain the source tenant constraint.',
      type: 'short_answer',
      difficulty: 'easy',
      tags: ['database'],
      answer: 'Use the referenced question tenant as the source of truth.',
      rubric: [{ point: 'mentions tenant', score: 10, description: 'Explains tenant scope.' }],
      sourceRefs: ['fixture://public-source-question'],
      status: 'published',
    },
  });
  await prisma.question.create({
    data: {
      id: privateQuestionId,
      tenantId: sourceTenantId,
      visibility: 'tenant',
      title: 'Private source question',
      stem: 'This question must not cross tenant boundaries.',
      type: 'short_answer',
      difficulty: 'easy',
      tags: ['database'],
      answer: 'Tenant-scoped questions stay within their tenant.',
      rubric: [{ point: 'tenant', score: 10, description: 'Explains tenant scope.' }],
      sourceRefs: ['fixture://private-source-question'],
      status: 'published',
    },
  });
  await prisma.knowledgeAsset.create({
    data: {
      id: assetId,
      tenantId: sourceTenantId,
      sourceType: 'fixture',
      uri: `fixture://${assetId}`,
      title: 'Source asset',
      status: 'published',
      metadata: {},
    },
  });
}

async function seedConsumerSession() {
  await prisma.practiceSession.create({
    data: {
      id: sessionId,
      tenantId: consumerTenantId,
      userId: consumerUserId,
      mode: 'manual',
      title: 'Cross-tenant public question test',
      status: 'in_progress',
    },
  });
}

async function cleanupRecords() {
  await prisma.importTask.deleteMany({ where: { title: invalidImportTitle } });
  await prisma.localCredential.deleteMany({
    where: { tenantId: { in: [consumerTenantId, sourceTenantId] } },
  });
  await prisma.practiceSessionItem.deleteMany({ where: { sessionId } });
  await prisma.practiceSession.deleteMany({ where: { id: sessionId } });
  await prisma.question.deleteMany({ where: { id: { in: [questionId, privateQuestionId] } } });
  await prisma.knowledgeAsset.deleteMany({ where: { id: assetId } });
  await prisma.user.deleteMany({ where: { id: { in: [consumerUserId, sourceUserId] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: [consumerTenantId, sourceTenantId] } } });
}
