import { describe, expect, it, vi } from 'vitest';
import { createExclusivePracticeStartRunner } from './practice-start-single-flight';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('练习创建 exclusive runner', () => {
  it('并发调用只执行第一个，成功后允许下一次', async () => {
    const pending = deferred();
    const action = vi.fn(() => pending.promise);
    const run = createExclusivePracticeStartRunner();

    const first = run(action);
    const second = run(action);

    expect(action).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBe(false);
    pending.resolve();
    await expect(first).resolves.toBe(true);
    await expect(run(() => Promise.resolve())).resolves.toBe(true);
  });

  it('action 拒绝时传播错误并释放锁', async () => {
    const reason = new Error('创建失败');
    const run = createExclusivePracticeStartRunner();

    await expect(run(() => Promise.reject(reason))).rejects.toBe(reason);
    await expect(run(() => Promise.resolve())).resolves.toBe(true);
  });
});
