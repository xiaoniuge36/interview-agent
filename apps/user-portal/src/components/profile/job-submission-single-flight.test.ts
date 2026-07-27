import { expect, it, vi } from 'vitest';
import { createExclusiveJobSubmissionRunner } from './job-submission-single-flight';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

it('runs only the first synchronous submission and reuses its promise', async () => {
  const pending = deferred<string>();
  const submit = vi.fn(() => pending.promise);
  const firstSuccess = vi.fn();
  const secondSuccess = vi.fn();
  const runner = createExclusiveJobSubmissionRunner();
  const first = runner.run({
    onError: vi.fn(),
    onSettled: vi.fn(),
    onStart: vi.fn(),
    onSuccess: firstSuccess,
    submit,
  });
  const second = runner.run({
    onError: vi.fn(),
    onSettled: vi.fn(),
    onStart: vi.fn(),
    onSuccess: secondSuccess,
    submit,
  });

  expect(second).toBe(first);
  expect(submit).toHaveBeenCalledTimes(1);
  pending.resolve('saved');
  await first;

  expect(firstSuccess).toHaveBeenCalledWith('saved');
  expect(secondSuccess).not.toHaveBeenCalled();
});

it('releases the lock after failure so a retry can run', async () => {
  const reason = new Error('save failed');
  const onError = vi.fn();
  const runner = createExclusiveJobSubmissionRunner();
  const failed = await runner.run({
    onError,
    onSettled: vi.fn(),
    onStart: vi.fn(),
    onSuccess: vi.fn(),
    submit: () => Promise.reject(reason),
  });
  const onSuccess = vi.fn();
  const retried = await runner.run({
    onError: vi.fn(),
    onSettled: vi.fn(),
    onStart: vi.fn(),
    onSuccess,
    submit: () => Promise.resolve('retried'),
  });

  expect(failed).toBe(false);
  expect(onError).toHaveBeenCalledWith(reason);
  expect(retried).toBe(true);
  expect(onSuccess).toHaveBeenCalledWith('retried');
});

it('suppresses stale handlers after invalidation without disabling the next lifecycle', async () => {
  const stalePending = deferred<string>();
  const staleHandlers = {
    onError: vi.fn(),
    onSettled: vi.fn(),
    onStart: vi.fn(),
    onSuccess: vi.fn(),
    submit: () => stalePending.promise,
  };
  const runner = createExclusiveJobSubmissionRunner();
  const staleRun = runner.run(staleHandlers);

  expect(staleHandlers.onStart).toHaveBeenCalledOnce();
  runner.invalidate();
  const currentPending = deferred<string>();
  const currentHandlers = {
    onError: vi.fn(),
    onSettled: vi.fn(),
    onStart: vi.fn(),
    onSuccess: vi.fn(),
    submit: () => currentPending.promise,
  };
  const currentRun = runner.run(currentHandlers);
  stalePending.resolve('stale');
  currentPending.resolve('current');
  await Promise.all([staleRun, currentRun]);

  expect(staleHandlers.onSuccess).not.toHaveBeenCalled();
  expect(staleHandlers.onError).not.toHaveBeenCalled();
  expect(staleHandlers.onSettled).not.toHaveBeenCalled();
  expect(currentHandlers.onStart).toHaveBeenCalledOnce();
  expect(currentHandlers.onSuccess).toHaveBeenCalledWith('current');
  expect(currentHandlers.onSettled).toHaveBeenCalledOnce();
});
