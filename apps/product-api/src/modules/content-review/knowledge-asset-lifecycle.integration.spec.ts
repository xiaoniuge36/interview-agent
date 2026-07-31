import { randomUUID } from 'node:crypto';
import { AuditService } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { BackgroundJobDispatcher } from '../jobs/job-dispatcher';
import { BackgroundJobRepository } from '../jobs/job-repository';
import { BackgroundJobWorker } from '../jobs/job-worker';
import { RetrievalJobProcessor } from '../retrieval/retrieval-job.processor';
import { RetrievalRepository } from '../retrieval/retrieval-repository';
import { CandidateReviewInfrastructure } from './candidate-review-infrastructure';
import { KnowledgeAssetLifecycleService } from './knowledge-asset-lifecycle.service';

const describeDatabase = process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;
const suffix = randomUUID();
const tenantId = `knowledge-lifecycle-${suffix}`;
const userId = `knowledge-admin-${suffix}`;
const assetId = `knowledge-asset-${suffix}`;
const rollbackAssetId = `knowledge-rollback-${suffix}`;
const prisma = new PrismaService();
const jobs = new BackgroundJobRepository(prisma);
const dispatcher = new BackgroundJobDispatcher(jobs);
const retrieval = new RetrievalRepository(prisma);
const service = lifecycle(new AuditService(prisma));
let databaseReady = false;
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

describeDatabase('KnowledgeAssetLifecycleService database integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
    databaseReady = true;
    await seedRecords();
  });

  afterAll(async () => {
    if (databaseReady) await cleanupRecords();
    if (databaseReady) await prisma.$disconnect();
  });

  it(
    'publishes atomically, recalls only while published, and reclaims dormant work on withdrawal',
    verifiesLifecycleBoundary,
  );

  it('does not commit the asset transition or job when publication audit fails', verifiesRollback);

  it(
    'allows an already claimed job to complete after withdrawal without restoring a projection',
    verifiesClaimedJobWithdrawal,
  );
});

async function verifiesLifecycleBoundary() {
  await service.publish(context, assetId);
  await service.publish(context, assetId);
  expect(await prisma.backgroundJob.count({ where: { tenantId } })).toBe(1);
  await expect(assetStatus(assetId)).resolves.toBe('published');
  await prisma.retrievalChunk.create({
    data: projection({ assetId, entityId: `${assetId}:1`, content: 'Asset lifecycle evidence.' }),
  });
  await expect(searchKnowledge('lifecycle')).resolves.toHaveLength(1);
  await service.unpublish(context, assetId);
  await expect(assetStatus(assetId)).resolves.toBe('review');
  await expect(searchKnowledge('lifecycle')).resolves.toEqual([]);
  expect(await prisma.retrievalChunk.count({ where: { tenantId } })).toBe(0);
  expect(await prisma.backgroundJob.count({ where: { tenantId } })).toBe(0);
}

async function verifiesRollback() {
  const failingAudit = { record: jest.fn().mockRejectedValue(new Error('AUDIT_WRITE_FAILED')) };
  await expect(lifecycle(failingAudit as never).publish(context, rollbackAssetId)).rejects.toThrow(
    'AUDIT_WRITE_FAILED',
  );
  await expect(assetStatus(rollbackAssetId)).resolves.toBe('review');
  expect(
    await prisma.backgroundJob.count({
      where: { tenantId, payload: { path: ['metadata', 'assetId'], equals: rollbackAssetId } },
    }),
  ).toBe(0);
}

async function verifiesClaimedJobWithdrawal() {
  await service.publish(context, assetId);
  const claimed = await prisma.backgroundJob.findFirstOrThrow({ where: { tenantId } });
  await prisma.backgroundJob.update({
    where: { id: claimed.id },
    data: { status: 'running', leaseOwner: 'worker-1', leaseExpiresAt: futureDate() },
  });
  await service.unpublish(context, assetId);
  const worker = new BackgroundJobWorker(
    workerRepository(claimed),
    'worker-1',
    new RetrievalJobProcessor({ embed: jest.fn().mockResolvedValue(vector()) } as never, retrieval),
  );
  await expect(worker.runOnce()).resolves.toBe(true);
  await expect(
    prisma.backgroundJob.findUniqueOrThrow({ where: { id: claimed.id } }),
  ).resolves.toMatchObject({
    status: 'succeeded',
  });
  expect(await prisma.retrievalChunk.count({ where: { tenantId } })).toBe(0);
}

function lifecycle(audit: Pick<AuditService, 'record'>) {
  return new KnowledgeAssetLifecycleService(
    new CandidateReviewInfrastructure(prisma, new PolicyService(), audit as AuditService),
    dispatcher,
  );
}

function workerRepository(job: {
  id: string;
  attempts: number;
  maxAttempts: number;
  tenantId: string;
  payload: unknown;
}) {
  return {
    claim: jest.fn().mockResolvedValue({ ...job, type: 'embedding' as const }),
    claimExpired: jest.fn(),
    complete: jobs.complete.bind(jobs),
    retry: jobs.retry.bind(jobs),
    deadLetter: jobs.deadLetter.bind(jobs),
  };
}

function projection(input: { assetId: string; entityId: string; content: string }) {
  return {
    tenantId,
    entityType: 'knowledge',
    entityId: input.entityId,
    content: input.content,
    contentHash: input.entityId,
    embeddingVersion: 'v1',
    status: 'ready' as const,
    metadata: { assetId: input.assetId, sequence: 1 },
  };
}

function searchKnowledge(query: string) {
  return retrieval.searchKeyword({ tenantId, entityTypes: ['knowledge'], query, limit: 8 });
}

function assetStatus(id: string) {
  return prisma.knowledgeAsset
    .findUniqueOrThrow({ where: { tenantId_id: { tenantId, id } } })
    .then((asset) => asset.status);
}

function futureDate() {
  return new Date(Date.now() + 60_000);
}

function vector() {
  return Array.from({ length: 1536 }, () => 0.1);
}

async function seedRecords() {
  await prisma.tenant.create({ data: { id: tenantId, slug: tenantId, name: tenantId } });
  await prisma.user.create({ data: { id: userId, tenantId, subject: userId, role: 'admin' } });
  await createAsset(assetId);
  await createAsset(rollbackAssetId);
}

async function createAsset(id: string) {
  await prisma.knowledgeAsset.create({
    data: {
      id,
      tenantId,
      sourceType: 'fixture',
      uri: `fixture://${id}`,
      title: id,
      status: 'review',
      metadata: {},
      chunks: { create: { content: 'Asset lifecycle evidence.', metadata: { sequence: 1 } } },
    },
  });
}

async function cleanupRecords() {
  await prisma.retrievalLog.deleteMany({ where: { tenantId } });
  await prisma.backgroundJob.deleteMany({ where: { tenantId } });
  await prisma.retrievalChunk.deleteMany({ where: { tenantId } });
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.knowledgeChunk.deleteMany({ where: { tenantId } });
  await prisma.knowledgeAsset.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
}
