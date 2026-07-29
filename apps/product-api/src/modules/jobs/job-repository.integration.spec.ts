import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/database/prisma.service';
import { BackgroundJobRepository } from './job-repository';

const describeDatabase = process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;
const suffix = randomUUID();
const tenantId = `job-tenant-${suffix}`;
const pendingJobId = `pending-${suffix}`;
const expiredJobId = `expired-${suffix}`;
const prisma = new PrismaService();
const repository = new BackgroundJobRepository(prisma);

describeDatabase('BackgroundJobRepository database integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await seedJobs();
  });

  afterAll(async () => {
    await prisma.backgroundJob.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  it('lets exactly one concurrent worker claim a pending job', async () => {
    const claims = await Promise.all([repository.claim('worker-a'), repository.claim('worker-b')]);

    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.filter(Boolean)[0]).toMatchObject({ id: pendingJobId, attempts: 1 });
  });

  it('reclaims an expired lease with the next attempt number', async () => {
    await expect(repository.claimExpired('worker-c')).resolves.toMatchObject({
      id: expiredJobId,
      attempts: 2,
    });
  });
});

async function seedJobs() {
  await prisma.tenant.create({ data: { id: tenantId, slug: tenantId, name: tenantId } });
  await prisma.backgroundJob.createMany({
    data: [
      {
        id: pendingJobId,
        tenantId,
        type: 'embedding',
        dedupeKey: pendingJobId,
        payload: { entityId: pendingJobId },
      },
      {
        id: expiredJobId,
        tenantId,
        type: 'embedding',
        status: 'running',
        attempts: 1,
        dedupeKey: expiredJobId,
        payload: { entityId: expiredJobId },
        leaseOwner: 'lost-worker',
        leaseExpiresAt: new Date(Date.now() - 1_000),
      },
    ],
  });
}
