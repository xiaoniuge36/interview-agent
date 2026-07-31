import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/database/prisma.service';
import { RetrievalRepository } from './retrieval-repository';

const describeDatabase = process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;
const suffix = randomUUID();
const tenantA = `retrieval-a-${suffix}`;
const tenantB = `retrieval-b-${suffix}`;
const assetId = `retrieval-asset-${suffix}`;
const prisma = new PrismaService();
const repository = new RetrievalRepository(prisma);

describeDatabase('RetrievalRepository database integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await seedChunks();
  });

  afterAll(async () => {
    await prisma.retrievalLog.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.retrievalChunk.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.knowledgeAsset.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await prisma.$disconnect();
  });

  it('returns only tenant A keyword chunks when another tenant has matching content', async () => {
    const hits = await repository.searchKeyword({
      tenantId: tenantA,
      entityTypes: ['knowledge'],
      query: 'event sourcing',
      limit: 8,
    });

    expect(hits).toEqual([expect.objectContaining({ tenantId: tenantA, entityId: 'chunk-a' })]);
  });

  it('keeps vector recall inside the same tenant scope', async () => {
    const hits = await repository.searchVector(
      { tenantId: tenantA, entityTypes: ['knowledge'], query: 'unused', limit: 8 },
      vector(),
    );

    expect(hits).toEqual([expect.objectContaining({ tenantId: tenantA, entityId: 'chunk-a' })]);
  });
});

async function seedChunks() {
  await prisma.tenant.createMany({
    data: [
      { id: tenantA, slug: tenantA, name: tenantA },
      { id: tenantB, slug: tenantB, name: tenantB },
    ],
  });
  await prisma.knowledgeAsset.createMany({
    data: [tenantA, tenantB].map((tenantId) => ({
      id: assetId,
      tenantId,
      sourceType: 'fixture',
      uri: `fixture://${assetId}`,
      title: 'Retrieval source',
      status: 'published',
      metadata: {},
    })),
  });
  await Promise.all(
    [tenantA, tenantB].map((tenantId) =>
      repository.writeEmbedding({
        tenantId,
        entityType: 'knowledge',
        entityId: 'chunk-a',
        content: 'Event sourcing makes state transitions replayable.',
        metadata: { assetId, fixture: true },
        embeddingVersion: 'v1',
        vector: vector(),
      }),
    ),
  );
}

function vector() {
  return Array.from({ length: 1536 }, () => 0.5);
}
