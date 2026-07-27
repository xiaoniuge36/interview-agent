import { expect, it, vi } from 'vitest';
import { createExclusiveCredentialActionRunner } from './model-credential-action';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

it('凭据 runner 阻止重复测试与冲突删除，结算后允许重试', async () => {
  const pending = deferred();
  const testConnection = vi.fn(() => pending.promise);
  const removeConnection = vi.fn(() => Promise.resolve());
  const run = createExclusiveCredentialActionRunner();

  const owner = run(testConnection);
  const duplicate = run(testConnection);
  const conflicting = run(removeConnection);

  expect(testConnection).toHaveBeenCalledTimes(1);
  await expect(duplicate).resolves.toBe(false);
  await expect(conflicting).resolves.toBe(false);
  expect(removeConnection).not.toHaveBeenCalled();
  pending.resolve();
  await expect(owner).resolves.toBe(true);
  await expect(run(removeConnection)).resolves.toBe(true);
});

it('凭据 runner 在命令拒绝时传播错误并释放锁', async () => {
  const reason = new Error('操作失败');
  const run = createExclusiveCredentialActionRunner();

  await expect(run(() => Promise.reject(reason))).rejects.toBe(reason);
  await expect(run(() => Promise.resolve())).resolves.toBe(true);
});
