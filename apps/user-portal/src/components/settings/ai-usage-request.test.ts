import { expect, it, vi } from 'vitest';
import { createLatestAiUsageRequest } from './ai-usage-request';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

it('aborts and ignores a stale AI usage response after the period changes', async () => {
  const older = deferred<string>();
  const latest = deferred<string>();
  let olderSignal: AbortSignal | undefined;
  const onSuccess = vi.fn();
  const request = createLatestAiUsageRequest();
  const olderRun = request.run({
    load: (signal) => {
      olderSignal = signal;
      return older.promise;
    },
    onError: vi.fn(),
    onSuccess,
  });
  const latestRun = request.run({
    load: () => latest.promise,
    onError: vi.fn(),
    onSuccess,
  });

  expect(olderSignal?.aborted).toBe(true);
  latest.resolve('30d');
  older.resolve('7d');
  await Promise.all([olderRun, latestRun]);

  expect(onSuccess).toHaveBeenCalledOnce();
  expect(onSuccess).toHaveBeenCalledWith('30d');
});

it('publishes a current error and suppresses callbacks after invalidation', async () => {
  const request = createLatestAiUsageRequest();
  const reason = new Error('usage unavailable');
  const onError = vi.fn();

  await request.run({ load: () => Promise.reject(reason), onError, onSuccess: vi.fn() });
  expect(onError).toHaveBeenCalledWith(reason);

  const pending = deferred<string>();
  const onSuccess = vi.fn();
  const run = request.run({ load: () => pending.promise, onError: vi.fn(), onSuccess });
  request.invalidate();
  pending.resolve('stale');
  await run;

  expect(onSuccess).not.toHaveBeenCalled();
});
