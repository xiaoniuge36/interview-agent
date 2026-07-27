import { expect, it, vi } from 'vitest';
import { runSessionSignOut } from './session-sign-out';

it('shares one in-flight sign-out across separate UI entry points', async () => {
  let resolve!: () => void;
  const pending = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  const signOut = vi.fn(() => pending);
  const first = runSessionSignOut(signOut);
  const second = await runSessionSignOut(signOut);

  expect(second).toBe(false);
  expect(signOut).toHaveBeenCalledOnce();
  resolve();
  expect(await first).toBe(true);
});
