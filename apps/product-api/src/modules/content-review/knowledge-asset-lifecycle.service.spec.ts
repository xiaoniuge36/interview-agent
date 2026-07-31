import type { ProductRequestContext } from '../../common/context/request-context';
import { CandidateReviewInfrastructure } from './candidate-review-infrastructure';
import { KnowledgeAssetLifecycleService } from './knowledge-asset-lifecycle.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'admin-1',
    subject: 'admin-1',
    tenantId: 'tenant-1',
    role: 'admin',
    scopes: ['candidate:review', 'question:write'],
  },
};

test('publishes a reviewed asset and queues its chunks in the serializable transaction', async () => {
  const { service, transaction, jobs } = createService(reviewAsset());

  await service.publish(context, 'asset-1');

  expect(transaction.knowledgeAsset.update).toHaveBeenCalledWith({
    where: { tenantId_id: { tenantId: 'tenant-1', id: 'asset-1' } },
    data: { status: 'published' },
  });
  expect(jobs.enqueueEmbedding).toHaveBeenCalledWith(
    expect.objectContaining({
      tenantId: 'tenant-1',
      entityType: 'knowledge',
      entityId: 'asset-1:1',
      metadata: expect.objectContaining({ assetId: 'asset-1', sequence: 1 }),
    }),
    transaction,
  );
});

test('replays an already published asset through idempotent job upserts', async () => {
  const { service, transaction, jobs } = createService(publishedAsset());

  await service.publish(context, 'asset-1');

  expect(transaction.knowledgeAsset.update).not.toHaveBeenCalled();
  expect(jobs.enqueueEmbedding).toHaveBeenCalledWith(expect.any(Object), transaction);
});

test('unpublishes an asset and removes its projections plus queued embeddings atomically', async () => {
  const { service, transaction, jobs } = createService(publishedAsset());

  await service.unpublish(context, 'asset-1');

  expect(transaction.knowledgeAsset.update).toHaveBeenCalledWith({
    where: { tenantId_id: { tenantId: 'tenant-1', id: 'asset-1' } },
    data: { status: 'review' },
  });
  expect(transaction.retrievalChunk.deleteMany).toHaveBeenCalledWith({
    where: expect.objectContaining({ tenantId: 'tenant-1', entityType: 'knowledge' }),
  });
  expect(jobs.removeKnowledgeEmbeddings).toHaveBeenCalledWith('tenant-1', 'asset-1', transaction);
});

test('rejects asset publication by a non-admin reviewer', async () => {
  const { service } = createService(reviewAsset());
  const reviewerContext: ProductRequestContext = {
    ...context,
    actor: { ...context.actor, id: 'reviewer-1', role: 'question_reviewer' },
  };

  await expect(service.publish(reviewerContext, 'asset-1')).rejects.toMatchObject({
    response: expect.objectContaining({ code: 'ROLE_NOT_ALLOWED' }),
  });
});

function createService(asset: {
  id: string;
  tenantId: string;
  status: 'review' | 'published';
  title: string;
}) {
  const transaction = {
    knowledgeAsset: {
      findFirst: jest.fn().mockResolvedValue(asset),
      update: jest.fn().mockResolvedValue({ ...asset, status: 'published' }),
    },
    knowledgeChunk: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ content: 'Reviewed source content.', metadata: { sequence: 1 } }]),
    },
    retrievalChunk: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };
  const policy = { assert: jest.fn() };
  const audit = { record: jest.fn().mockResolvedValue({}) };
  const jobs = {
    enqueueEmbedding: jest.fn().mockResolvedValue({ id: 'job-1' }),
    removeKnowledgeEmbeddings: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const service = new KnowledgeAssetLifecycleService(
    new CandidateReviewInfrastructure(prisma as never, policy as never, audit as never),
    jobs as never,
  );
  return { service, transaction, jobs };
}

function reviewAsset() {
  return {
    id: 'asset-1',
    tenantId: 'tenant-1',
    status: 'review' as const,
    title: 'Review asset',
  };
}

function publishedAsset() {
  return { ...reviewAsset(), status: 'published' as const };
}
