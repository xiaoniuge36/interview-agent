import { expect, it, vi } from 'vitest';
import { createExclusiveWeaknessReviewRunner } from './weakness-review';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

it('弱项复练 runner 阻止重复创建，结算后允许重试', async () => {
  const pending = deferred();
  const action = vi.fn(() => pending.promise);
  const run = createExclusiveWeaknessReviewRunner();

  const owner = run(action);
  const duplicate = run(action);

  expect(action).toHaveBeenCalledTimes(1);
  await expect(duplicate).resolves.toBe(false);
  pending.resolve();
  await expect(owner).resolves.toBe(true);
  await expect(run(() => Promise.resolve())).resolves.toBe(true);
});

it('弱项复练 runner 在命令拒绝时传播错误并释放锁', async () => {
  const reason = new Error('创建失败');
  const run = createExclusiveWeaknessReviewRunner();

  await expect(run(() => Promise.reject(reason))).rejects.toBe(reason);
  await expect(run(() => Promise.resolve())).resolves.toBe(true);
});
