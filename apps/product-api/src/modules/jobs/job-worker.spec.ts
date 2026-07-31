import { BackgroundJobWorker } from './job-worker';

test('retries a rate-limited job before its attempt budget is exhausted', async () => {
  const repository = { claim: jest.fn(), retry: jest.fn(), deadLetter: jest.fn() };
  const worker = new BackgroundJobWorker(repository as never, 'worker-1');
  const job = { id: 'job-1', attempts: 1, maxAttempts: 3 };

  await worker.fail(job as never, 'MODEL_PROVIDER_RATE_LIMITED');

  expect(repository.retry).toHaveBeenCalledWith(job, 'MODEL_PROVIDER_RATE_LIMITED');
  expect(repository.deadLetter).not.toHaveBeenCalled();
});

test('dead-letters a non-retryable job', async () => {
  const repository = { claim: jest.fn(), retry: jest.fn(), deadLetter: jest.fn() };
  const worker = new BackgroundJobWorker(repository as never, 'worker-1');
  const job = { id: 'job-1', attempts: 1, maxAttempts: 3 };

  await worker.fail(job as never, 'EMBEDDING_DIMENSION_INVALID');

  expect(repository.deadLetter).toHaveBeenCalledWith(job, 'EMBEDDING_DIMENSION_INVALID');
});

test('processes a claimed job once and releases its lease as succeeded', async () => {
  const job = { id: 'job-1', attempts: 1, maxAttempts: 3 };
  const repository = {
    claim: jest.fn().mockResolvedValue(job),
    claimExpired: jest.fn(),
    complete: jest.fn(),
    retry: jest.fn(),
    deadLetter: jest.fn(),
  };
  const processor = { process: jest.fn().mockResolvedValue(undefined) };
  const worker = new BackgroundJobWorker(repository as never, 'worker-1', processor);

  await expect(worker.runOnce()).resolves.toBe(true);

  expect(processor.process).toHaveBeenCalledWith(job);
  expect(repository.complete).toHaveBeenCalledWith(job);
});
