import { describe, expect, it, vi } from 'vitest';
import { createSingleFlightRunner } from './conversation-creation';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('对话创建 single-flight 成功路径', () => {
  it('并发调用共享一次 action，完成后允许下一次调用', async () => {
    const pending = deferred<number>();
    const action = vi.fn(() => pending.promise);
    const run = createSingleFlightRunner<number>();

    const first = run(action);
    const second = run(action);

    expect(second).toBe(first);
    expect(action).toHaveBeenCalledTimes(1);
    pending.resolve(1);
    await expect(first).resolves.toBe(1);

    await expect(run(() => Promise.resolve(2))).resolves.toBe(2);
  });
});

describe('对话创建 single-flight 失败路径', () => {
  it('拒绝后释放锁并允许重试', async () => {
    const reason = new Error('创建失败');
    const run = createSingleFlightRunner<string>();

    await expect(run(() => Promise.reject(reason))).rejects.toBe(reason);
    await expect(run(() => Promise.resolve('retried'))).resolves.toBe('retried');
  });
});
