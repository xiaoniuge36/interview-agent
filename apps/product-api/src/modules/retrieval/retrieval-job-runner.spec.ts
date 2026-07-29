import { RetrievalJobRunner } from './retrieval-job-runner';
import { Logger } from '@nestjs/common';

test('does not poll background jobs until the worker flag is explicitly enabled', async () => {
  const config = { get: jest.fn().mockReturnValue(false) };
  const worker = { runOnce: jest.fn() };
  const runner = new RetrievalJobRunner(config as never, worker as never);

  await runner.onModuleInit();

  expect(worker.runOnce).not.toHaveBeenCalled();
  await runner.onModuleDestroy();
});

test('runs an initial job poll when the worker flag is enabled', async () => {
  const config = { get: jest.fn().mockReturnValueOnce(true).mockReturnValue(10_000) };
  const worker = { runOnce: jest.fn().mockResolvedValue(false) };
  const runner = new RetrievalJobRunner(config as never, worker as never);

  await runner.onModuleInit();

  expect(worker.runOnce).toHaveBeenCalledTimes(1);
  await runner.onModuleDestroy();
});

test('keeps the API lifecycle alive when a background poll fails', async () => {
  const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  const config = { get: jest.fn().mockReturnValueOnce(true).mockReturnValue(10_000) };
  const worker = { runOnce: jest.fn().mockRejectedValue(new Error('database unavailable')) };
  const runner = new RetrievalJobRunner(config as never, worker as never);

  await expect(runner.onModuleInit()).resolves.toBeUndefined();

  expect(log).toHaveBeenCalled();
  log.mockRestore();
  await runner.onModuleDestroy();
});
