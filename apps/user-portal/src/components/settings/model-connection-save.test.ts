import { expect, it, vi } from 'vitest';
import { createExclusiveModelConnectionSaveRunner } from './model-connection-save';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

it('模型连接保存 runner 阻止重复提交，结算后允许重试', async () => {
  const pending = deferred();
  const save = vi.fn(() => pending.promise);
  const run = createExclusiveModelConnectionSaveRunner();

  const owner = run(save);
  const duplicate = run(save);

  expect(save).toHaveBeenCalledTimes(1);
  await expect(duplicate).resolves.toBe(false);
  pending.resolve();
  await expect(owner).resolves.toBe(true);
  await expect(run(() => Promise.resolve())).resolves.toBe(true);
});

it('模型连接保存 runner 在命令拒绝时传播错误并释放锁', async () => {
  const reason = new Error('保存失败');
  const run = createExclusiveModelConnectionSaveRunner();

  await expect(run(() => Promise.reject(reason))).rejects.toBe(reason);
  await expect(run(() => Promise.resolve())).resolves.toBe(true);
});
