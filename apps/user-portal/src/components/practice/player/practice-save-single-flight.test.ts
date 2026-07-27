import { describe, expect, it, vi } from 'vitest';
import { createExclusivePracticeSaveRunner } from './practice-save-single-flight';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('练习回答保存 exclusive runner', () => {
  it('并发保存返回 false，owner 结果透传且结算后可重试', async () => {
    const pending = deferred<boolean>();
    const action = vi.fn(() => pending.promise);
    const run = createExclusivePracticeSaveRunner();

    const owner = run(action);
    const ignored = run(action);

    expect(action).toHaveBeenCalledTimes(1);
    await expect(ignored).resolves.toBe(false);
    pending.resolve(true);
    await expect(owner).resolves.toBe(true);
    await expect(run(() => Promise.resolve(false))).resolves.toBe(false);
  });

  it('保存拒绝时传播错误并释放锁', async () => {
    const reason = new Error('保存失败');
    const run = createExclusivePracticeSaveRunner();

    await expect(run(() => Promise.reject(reason))).rejects.toBe(reason);
    await expect(run(() => Promise.resolve(true))).resolves.toBe(true);
  });
});
