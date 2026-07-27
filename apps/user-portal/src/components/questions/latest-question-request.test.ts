import { describe, expect, it, vi } from 'vitest';
import { createLatestQuestionRequestRunner } from './latest-question-request';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('题库 latest request 成功竞争', () => {
  it('反序完成时只应用最新结果和 settlement', async () => {
    const older = deferred<string>();
    const latest = deferred<string>();
    const applied: string[] = [];
    const onSettled = vi.fn();
    const runner = createLatestQuestionRequestRunner();
    const olderRun = runner.run({
      load: () => older.promise,
      onError: vi.fn(),
      onSettled,
      onSuccess: (value) => applied.push(value),
    });
    const latestRun = runner.run({
      load: () => latest.promise,
      onError: vi.fn(),
      onSettled,
      onSuccess: (value) => applied.push(value),
    });

    latest.resolve('new-catalog');
    await latestRun;
    older.resolve('old-catalog');
    await olderRun;

    expect(applied).toEqual(['new-catalog']);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});

describe('题库 latest request 错误竞争', () => {
  it('忽略旧请求的晚到错误', async () => {
    const older = deferred<string>();
    const runner = createLatestQuestionRequestRunner();
    const onError = vi.fn();
    const olderRun = runner.run({
      load: () => older.promise,
      onError,
      onSettled: vi.fn(),
      onSuccess: vi.fn(),
    });
    await runner.run({
      load: () => Promise.resolve('new-catalog'),
      onError,
      onSettled: vi.fn(),
      onSuccess: vi.fn(),
    });

    older.reject(new Error('旧筛选失败'));

    await olderRun;
    expect(onError).not.toHaveBeenCalled();
  });

  it('最新请求失败时报告错误并 settlement', async () => {
    const reason = new Error('题库失败');
    const onError = vi.fn();
    const onSettled = vi.fn();
    const runner = createLatestQuestionRequestRunner();

    await runner.run({
      load: () => Promise.reject(reason),
      onError,
      onSettled,
      onSuccess: vi.fn(),
    });

    expect(onError).toHaveBeenCalledWith(reason);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});

describe('题库 latest request cleanup', () => {
  it('invalidate 后忽略在途请求的所有回调', async () => {
    const pending = deferred<string>();
    const onSuccess = vi.fn();
    const onSettled = vi.fn();
    const runner = createLatestQuestionRequestRunner();
    const request = runner.run({
      load: () => pending.promise,
      onError: vi.fn(),
      onSettled,
      onSuccess,
    });

    runner.invalidate();
    pending.resolve('stale');
    await request;

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();
  });
});
