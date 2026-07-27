import { describe, expect, it, vi } from 'vitest';
import { createExclusivePracticeCompletionRunner } from './practice-completion-single-flight';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('练习完成 exclusive runner', () => {
  it('在途 AI 复盘阻止重复与自学完成，结算后允许重试', async () => {
    const pending = deferred();
    const aiReport = vi.fn(() => pending.promise);
    const selfStudy = vi.fn(() => Promise.resolve());
    const run = createExclusivePracticeCompletionRunner();

    const first = run(aiReport);
    const duplicate = run(aiReport);
    const conflicting = run(selfStudy);

    expect(aiReport).toHaveBeenCalledTimes(1);
    await expect(duplicate).resolves.toBe(false);
    await expect(conflicting).resolves.toBe(false);
    expect(selfStudy).not.toHaveBeenCalled();
    pending.resolve();
    await expect(first).resolves.toBe(true);
    await expect(run(selfStudy)).resolves.toBe(true);
  });

  it('完成命令拒绝时传播错误并释放锁', async () => {
    const reason = new Error('完成失败');
    const run = createExclusivePracticeCompletionRunner();

    await expect(run(() => Promise.reject(reason))).rejects.toBe(reason);
    await expect(run(() => Promise.resolve())).resolves.toBe(true);
  });
});
