import { expect, it, vi } from 'vitest';
import { createLatestWorkspaceRequest } from './useWorkspaceData';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

it('Workspace 共享 Promise 只应用最新 reload 的成功处理', async () => {
  const pending = deferred<string>();
  const applied: string[] = [];
  const request = createLatestWorkspaceRequest();
  const older = request.run({
    load: () => pending.promise,
    onError: vi.fn(),
    onSuccess: (value) => applied.push(`older:${value}`),
  });
  const latest = request.run({
    load: () => pending.promise,
    onError: vi.fn(),
    onSuccess: (value) => applied.push(`latest:${value}`),
  });

  pending.resolve('workspace');
  await Promise.all([older, latest]);

  expect(applied).toEqual(['latest:workspace']);
});

it('Workspace 共享 Promise 只应用最新 reload 的错误处理', async () => {
  const pending = deferred<string>();
  const onOlderError = vi.fn();
  const onLatestError = vi.fn();
  const request = createLatestWorkspaceRequest();
  const older = request.run({
    load: () => pending.promise,
    onError: onOlderError,
    onSuccess: vi.fn(),
  });
  const latest = request.run({
    load: () => pending.promise,
    onError: onLatestError,
    onSuccess: vi.fn(),
  });

  const reason = new Error('workspace unavailable');
  pending.reject(reason);
  await Promise.all([older, latest]);

  expect(onOlderError).not.toHaveBeenCalled();
  expect(onLatestError).toHaveBeenCalledWith(reason);
});

it('Workspace invalidate 后忽略在途请求的所有回调', async () => {
  const pending = deferred<string>();
  const onSuccess = vi.fn();
  const onError = vi.fn();
  const request = createLatestWorkspaceRequest();
  const run = request.run({ load: () => pending.promise, onError, onSuccess });

  request.invalidate();
  pending.resolve('stale');
  await run;

  expect(onSuccess).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();
});
