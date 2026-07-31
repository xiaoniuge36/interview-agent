import { BackgroundJobDispatcher } from './job-dispatcher';

test('creates a stable embedding job key for unchanged source content', async () => {
  const repository = { enqueue: jest.fn().mockResolvedValue({ id: 'job-1' }) };
  const dispatcher = new BackgroundJobDispatcher(repository as never);
  const input = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    traceId: 'trace-1',
    entityType: 'knowledge',
    entityId: 'asset-1:1',
    content: 'Index this source text.',
    metadata: { source: 'import' },
  };

  await dispatcher.enqueueEmbedding(input);
  await dispatcher.enqueueEmbedding(input);

  expect(repository.enqueue).toHaveBeenCalledTimes(2);
  expect(repository.enqueue.mock.calls[0][0]).toEqual(repository.enqueue.mock.calls[1][0]);
  expect(repository.enqueue).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'embedding',
      payload: expect.objectContaining({ schemaVersion: 1, entityId: 'asset-1:1' }),
    }),
  );
});

test('enqueues an embedding through the caller transaction when publication must be atomic', async () => {
  const repository = { enqueue: jest.fn().mockResolvedValue({ id: 'job-1' }) };
  const dispatcher = new BackgroundJobDispatcher(repository as never);
  const transaction = { backgroundJob: { upsert: jest.fn() } };
  const transactionalDispatcher = dispatcher as unknown as {
    enqueueEmbedding(
      input: {
        tenantId: string;
        userId: string;
        traceId: string;
        entityType: string;
        entityId: string;
        content: string;
        metadata: Record<string, unknown>;
      },
      transaction: { backgroundJob: { upsert: jest.Mock } },
    ): Promise<unknown>;
  };

  await transactionalDispatcher.enqueueEmbedding(
    {
      tenantId: 'tenant-1',
      userId: 'admin-1',
      traceId: 'trace-1',
      entityType: 'knowledge',
      entityId: 'asset-1:1',
      content: 'Published source content.',
      metadata: { assetId: 'asset-1', sequence: 1 },
    },
    transaction,
  );

  expect(repository.enqueue).toHaveBeenCalledWith(expect.any(Object), transaction);
});
