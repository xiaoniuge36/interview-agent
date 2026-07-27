import { describe, expect, it, vi } from 'vitest';
import { createExclusivePracticeSolutionRunner } from './practice-solution-single-flight';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('练习参考答案 exclusive runner', () => {
  it('在途加载阻止重复与冲突请求，结算后允许重试', async () => {
    const pending = deferred();
    const firstSolution = vi.fn(() => pending.promise);
    const anotherSolution = vi.fn(() => Promise.resolve());
    const run = createExclusivePracticeSolutionRunner();

    const owner = run(firstSolution);
    const duplicate = run(firstSolution);
    const conflicting = run(anotherSolution);

    expect(firstSolution).toHaveBeenCalledTimes(1);
    await expect(duplicate).resolves.toBe(false);
    await expect(conflicting).resolves.toBe(false);
    expect(anotherSolution).not.toHaveBeenCalled();
    pending.resolve();
    await expect(owner).resolves.toBe(true);
    await expect(run(anotherSolution)).resolves.toBe(true);
  });

  it('加载拒绝时传播错误并释放锁', async () => {
    const reason = new Error('参考答案加载失败');
    const run = createExclusivePracticeSolutionRunner();

    await expect(run(() => Promise.reject(reason))).rejects.toBe(reason);
    await expect(run(() => Promise.resolve())).resolves.toBe(true);
  });
});
