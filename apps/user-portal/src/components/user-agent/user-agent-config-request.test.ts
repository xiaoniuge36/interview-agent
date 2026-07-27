import { expect, it, vi } from 'vitest';
import { createLatestUserAgentConfigRequest } from './user-agent-config-request';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

it('aborts the older config request and only publishes the latest success', async () => {
  const olderPending = deferred<string>();
  const latestPending = deferred<string>();
  let olderSignal: AbortSignal | undefined;
  const applied: string[] = [];
  const request = createLatestUserAgentConfigRequest();
  const older = request.run({
    load: (signal) => {
      olderSignal = signal;
      return olderPending.promise;
    },
    onError: vi.fn(),
    onSettled: vi.fn(),
    onSuccess: (value) => applied.push(`older:${value}`),
  });
  const latest = request.run({
    load: () => latestPending.promise,
    onError: vi.fn(),
    onSettled: vi.fn(),
    onSuccess: (value) => applied.push(`latest:${value}`),
  });

  expect(olderSignal?.aborted).toBe(true);
  latestPending.resolve('new');
  olderPending.resolve('old');
  await Promise.all([older, latest]);
  expect(applied).toEqual(['latest:new']);
});

it('publishes the current config error and settlement', async () => {
  const reason = new Error('config unavailable');
  const onError = vi.fn();
  const onSettled = vi.fn();
  const request = createLatestUserAgentConfigRequest();

  const result = await request.run({
    load: () => Promise.reject(reason),
    onError,
    onSettled,
    onSuccess: vi.fn(),
  });

  expect(result).toBe(false);
  expect(onError).toHaveBeenCalledWith(reason);
  expect(onSettled).toHaveBeenCalledOnce();
});

it('aborts and suppresses every in-flight handler after invalidation', async () => {
  const pending = deferred<string>();
  const handlers = { onError: vi.fn(), onSettled: vi.fn(), onSuccess: vi.fn() };
  let signal: AbortSignal | undefined;
  const request = createLatestUserAgentConfigRequest();
  const run = request.run({
    ...handlers,
    load: (nextSignal) => {
      signal = nextSignal;
      return pending.promise;
    },
  });

  request.invalidate();
  pending.resolve('stale');
  await run;

  expect(signal?.aborted).toBe(true);
  expect(handlers.onSuccess).not.toHaveBeenCalled();
  expect(handlers.onError).not.toHaveBeenCalled();
  expect(handlers.onSettled).not.toHaveBeenCalled();
});
