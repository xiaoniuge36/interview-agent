import { RetrievalJobProcessor } from './retrieval-job.processor';
import { BackgroundJobWorker } from '../jobs/job-worker';

test('projects a queued embedding job into a ready retrieval chunk', async () => {
  const embeddings = { embed: jest.fn().mockResolvedValue([0.1]) };
  const repository = { writeEmbedding: jest.fn().mockResolvedValue(undefined) };
  const processor = new RetrievalJobProcessor(embeddings as never, repository as never);
  const job = {
    id: 'job-1',
    tenantId: 'tenant-1',
    type: 'embedding' as const,
    attempts: 1,
    maxAttempts: 5,
    payload: {
      schemaVersion: 1,
      userId: 'user-1',
      traceId: 'trace-1',
      entityType: 'knowledge',
      entityId: 'asset-1:1',
      content: 'Retrieval source',
      metadata: { source: 'import' },
      embeddingVersion: 'v1',
    },
  };

  await processor.process(job);

  expect(embeddings.embed).toHaveBeenCalledWith(
    expect.objectContaining({ tenantId: 'tenant-1', text: 'Retrieval source' }),
  );
  expect(repository.writeEmbedding).toHaveBeenCalledWith(
    expect.objectContaining({ entityId: 'asset-1:1', vector: [0.1] }),
  );
});

test('rejects malformed payloads as non-retryable embedding failures', async () => {
  const processor = new RetrievalJobProcessor(
    { embed: jest.fn() } as never,
    {
      writeEmbedding: jest.fn(),
    } as never,
  );

  await expect(
    processor.process({ id: 'job-1', attempts: 1, maxAttempts: 5, type: 'embedding', payload: {} }),
  ).rejects.toEqual(expect.objectContaining({ code: 'JOB_PAYLOAD_INVALID' }));
});

test('completes a claimed job when the published-asset projection guard skips a withdrawn asset', async () => {
  const job = validJob();
  const projection = { writeEmbedding: jest.fn().mockResolvedValue(undefined) };
  const processor = new RetrievalJobProcessor(
    { embed: jest.fn().mockResolvedValue([0.1]) } as never,
    projection as never,
  );
  const jobs = {
    claim: jest.fn().mockResolvedValue(job),
    claimExpired: jest.fn(),
    complete: jest.fn().mockResolvedValue(undefined),
    retry: jest.fn(),
    deadLetter: jest.fn(),
  };
  const worker = new BackgroundJobWorker(jobs, 'worker-1', processor);

  await expect(worker.runOnce()).resolves.toBe(true);

  expect(projection.writeEmbedding).toHaveBeenCalledWith(
    expect.objectContaining({ entityId: 'asset-1:1' }),
  );
  expect(jobs.complete).toHaveBeenCalledWith(job);
  expect(jobs.retry).not.toHaveBeenCalled();
  expect(jobs.deadLetter).not.toHaveBeenCalled();
});

function validJob() {
  return {
    id: 'job-1',
    tenantId: 'tenant-1',
    type: 'embedding' as const,
    attempts: 1,
    maxAttempts: 5,
    payload: {
      schemaVersion: 1,
      userId: 'user-1',
      traceId: 'trace-1',
      entityType: 'knowledge',
      entityId: 'asset-1:1',
      content: 'Retrieval source',
      metadata: { assetId: 'asset-1', source: 'knowledge_asset_publish' },
      embeddingVersion: 'v1',
    },
  };
}
