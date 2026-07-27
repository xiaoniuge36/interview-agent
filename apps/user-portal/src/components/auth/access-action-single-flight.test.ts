import { expect, it, vi } from 'vitest';
import { createExclusiveAccessActionRunner } from './access-action-single-flight';

it('blocks a synchronous duplicate and allows another action after settlement', async () => {
  let resolve!: () => void;
  const pending = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  const action = vi.fn(() => pending);
  const run = createExclusiveAccessActionRunner();
  const first = run(action);
  const duplicate = await run(action);

  expect(duplicate).toBe(false);
  expect(action).toHaveBeenCalledOnce();
  resolve();
  expect(await first).toBe(true);
  expect(await run(() => Promise.resolve())).toBe(true);
});

it('releases the lock when the authentication action rejects', async () => {
  const run = createExclusiveAccessActionRunner();

  await expect(run(() => Promise.reject(new Error('auth failed')))).rejects.toThrow('auth failed');
  await expect(run(() => Promise.resolve())).resolves.toBe(true);
});
