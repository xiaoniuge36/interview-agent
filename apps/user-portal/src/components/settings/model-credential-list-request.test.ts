import { expect, it, vi } from 'vitest';
import { createLatestCredentialListRequest } from './model-credential-list-request';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

it('凭据列表反序完成时只应用最新结果和 settlement', async () => {
  const older = deferred<string>();
  const latest = deferred<string>();
  const applied: string[] = [];
  const onSettled = vi.fn();
  const request = createLatestCredentialListRequest();
  const olderRun = request.run({
    load: () => older.promise,
    onError: vi.fn(),
    onSettled,
    onSuccess: (value) => applied.push(value),
  });
  const latestRun = request.run({
    load: () => latest.promise,
    onError: vi.fn(),
    onSettled,
    onSuccess: (value) => applied.push(value),
  });

  latest.resolve('latest');
  await latestRun;
  older.resolve('stale');
  await olderRun;

  expect(applied).toEqual(['latest']);
  expect(onSettled).toHaveBeenCalledTimes(1);
});

it('凭据列表忽略旧请求的晚到错误', async () => {
  const older = deferred<string>();
  const onError = vi.fn();
  const request = createLatestCredentialListRequest();
  const olderRun = request.run({
    load: () => older.promise,
    onError,
    onSettled: vi.fn(),
    onSuccess: vi.fn(),
  });
  await request.run({
    load: () => Promise.resolve('latest'),
    onError,
    onSettled: vi.fn(),
    onSuccess: vi.fn(),
  });

  older.reject(new Error('stale failure'));
  await olderRun;

  expect(onError).not.toHaveBeenCalled();
});

it('凭据列表最新请求失败时报告错误并 settlement', async () => {
  const reason = new Error('latest failure');
  const onError = vi.fn();
  const onSettled = vi.fn();
  const request = createLatestCredentialListRequest();

  await request.run({
    load: () => Promise.reject(reason),
    onError,
    onSettled,
    onSuccess: vi.fn(),
  });

  expect(onError).toHaveBeenCalledWith(reason);
  expect(onSettled).toHaveBeenCalledTimes(1);
});

it('凭据列表 invalidate 后忽略在途请求的所有回调', async () => {
  const pending = deferred<string>();
  const onSuccess = vi.fn();
  const onSettled = vi.fn();
  const request = createLatestCredentialListRequest();
  const run = request.run({
    load: () => pending.promise,
    onError: vi.fn(),
    onSettled,
    onSuccess,
  });

  request.invalidate();
  pending.resolve('stale');
  await run;

  expect(onSuccess).not.toHaveBeenCalled();
  expect(onSettled).not.toHaveBeenCalled();
});
