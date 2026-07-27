import { describe, expect, it, vi } from 'vitest';
import { createExclusiveInterviewActionRunner } from './interview-action-single-flight';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('模拟面试 exclusive action runner', () => {
  it('在途 start 阻止重复 start 和 answer，完成后允许下一条命令', async () => {
    const pending = deferred();
    const start = vi.fn(() => pending.promise);
    const answer = vi.fn(() => Promise.resolve());
    const run = createExclusiveInterviewActionRunner();

    const first = run(start);
    const duplicate = run(start);
    const overlappingAnswer = run(answer);

    expect(start).toHaveBeenCalledTimes(1);
    await expect(duplicate).resolves.toBe(false);
    await expect(overlappingAnswer).resolves.toBe(false);
    expect(answer).not.toHaveBeenCalled();
    pending.resolve();
    await expect(first).resolves.toBe(true);
    await expect(run(answer)).resolves.toBe(true);
  });

  it('命令拒绝时传播错误并释放锁', async () => {
    const reason = new Error('命令失败');
    const run = createExclusiveInterviewActionRunner();

    await expect(run(() => Promise.reject(reason))).rejects.toBe(reason);
    await expect(run(() => Promise.resolve())).resolves.toBe(true);
  });
});
