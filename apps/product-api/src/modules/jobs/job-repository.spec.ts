import { BackgroundJobRepository } from './job-repository';

test('enqueues an idempotent embedding job by tenant and dedupe key', async () => {
  const backgroundJob = { upsert: jest.fn().mockResolvedValue({ id: 'job-1' }) };
  const repository = new BackgroundJobRepository({ backgroundJob } as never);

  await repository.enqueue({
    tenantId: 'tenant-1',
    type: 'embedding',
    dedupeKey: 'chunk-1:v1',
    payload: { chunkId: 'chunk-1' },
  });

  expect(backgroundJob.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        tenantId_type_dedupeKey: {
          tenantId: 'tenant-1',
          type: 'embedding',
          dedupeKey: 'chunk-1:v1',
        },
      },
      update: {},
    }),
  );
});

test('only removes dormant knowledge embedding jobs when an asset is withdrawn', async () => {
  const backgroundJob = { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) };
  const repository = new BackgroundJobRepository({ backgroundJob } as never);

  await repository.removeKnowledgeEmbeddings('tenant-1', 'asset-1');

  expect(backgroundJob.deleteMany).toHaveBeenCalledWith({
    where: {
      tenantId: 'tenant-1',
      type: 'embedding',
      status: { in: ['pending', 'retry_wait'] },
      AND: [
        { payload: { path: ['entityType'], equals: 'knowledge' } },
        { payload: { path: ['metadata', 'assetId'], equals: 'asset-1' } },
      ],
    },
  });
});

test('claims at most one due job through the atomic raw query', async () => {
  const $queryRaw = jest.fn().mockResolvedValue([{ id: 'job-1' }]);
  const repository = new BackgroundJobRepository({ $queryRaw } as never);

  await expect(repository.claim('worker-1')).resolves.toMatchObject({ id: 'job-1' });

  expect($queryRaw).toHaveBeenCalledTimes(1);
});

test('reclaims an expired lease for another worker', async () => {
  const $queryRaw = jest.fn().mockResolvedValue([{ id: 'job-1', attempts: 2, maxAttempts: 5 }]);
  const repository = new BackgroundJobRepository({ $queryRaw } as never);

  await expect(repository.claimExpired('worker-2')).resolves.toMatchObject({
    id: 'job-1',
    attempts: 2,
  });

  expect($queryRaw).toHaveBeenCalledTimes(1);
});

test('schedules exponential retry and completes jobs without a live lease', async () => {
  const backgroundJob = { update: jest.fn().mockResolvedValue({}) };
  const repository = new BackgroundJobRepository({ backgroundJob } as never);
  const before = Date.now();

  await repository.retry({ id: 'job-1', attempts: 3 }, 'MODEL_PROVIDER_UNAVAILABLE');
  await repository.complete({ id: 'job-1' });

  const retryCall = backgroundJob.update.mock.calls[0][0];
  expect(retryCall.data.availableAt.getTime() - before).toBeGreaterThanOrEqual(4_000);
  expect(retryCall.data.leaseOwner).toBeNull();
  expect(backgroundJob.update).toHaveBeenLastCalledWith({
    where: { id: 'job-1' },
    data: { status: 'succeeded', leaseOwner: null, leaseExpiresAt: null, errorCode: null },
  });
});
