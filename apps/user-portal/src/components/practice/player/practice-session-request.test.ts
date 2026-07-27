import { describe, expect, it, vi } from 'vitest';
import { createLatestPracticeSessionRequest } from './practice-session-request';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('练习 session latest request 成功竞争', () => {
  it('反序完成时只应用最新 session', async () => {
    const older = deferred<string>();
    const latest = deferred<string>();
    const applied: string[] = [];
    const request = createLatestPracticeSessionRequest();
    const olderRun = request.run({
      load: () => older.promise,
      onError: vi.fn(),
      onSuccess: (value) => applied.push(value),
    });
    const latestRun = request.run({
      load: () => latest.promise,
      onError: vi.fn(),
      onSuccess: (value) => applied.push(value),
    });

    latest.resolve('session-b');
    await latestRun;
    older.resolve('session-a');
    await olderRun;

    expect(applied).toEqual(['session-b']);
  });
});

describe('练习 session latest request 错误竞争', () => {
  it('忽略旧 session 的晚到错误', async () => {
    const older = deferred<string>();
    const onError = vi.fn();
    const request = createLatestPracticeSessionRequest();
    const olderRun = request.run({ load: () => older.promise, onError, onSuccess: vi.fn() });
    await request.run({
      load: () => Promise.resolve('session-b'),
      onError,
      onSuccess: vi.fn(),
    });

    older.reject(new Error('旧 session 失败'));
    await olderRun;

    expect(onError).not.toHaveBeenCalled();
  });

  it('最新 session 失败时报告错误', async () => {
    const reason = new Error('恢复失败');
    const onError = vi.fn();
    const request = createLatestPracticeSessionRequest();

    await request.run({ load: () => Promise.reject(reason), onError, onSuccess: vi.fn() });

    expect(onError).toHaveBeenCalledWith(reason);
  });
});

describe('练习 session request cleanup', () => {
  it('invalidate 后忽略在途结果', async () => {
    const pending = deferred<string>();
    const onSuccess = vi.fn();
    const request = createLatestPracticeSessionRequest();
    const running = request.run({
      load: () => pending.promise,
      onError: vi.fn(),
      onSuccess,
    });

    request.invalidate();
    pending.resolve('stale');
    await running;

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
