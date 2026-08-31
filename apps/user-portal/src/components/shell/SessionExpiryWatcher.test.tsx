import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { createSessionExpiryListener } from './SessionExpiryWatcher';

function expiredError() {
  return new ApiError({
    message: '登录状态已失效，请重新登录。',
    code: 'AUTH_REQUIRED',
    status: 401,
  });
}

describe('createSessionExpiryListener', () => {
  it('并发 401 只提示并登出一次', async () => {
    let release: () => void = () => undefined;
    const signOut = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const notifyExpired = vi.fn();
    const listener = createSessionExpiryListener({ notifyExpired, signOut });

    listener(expiredError());
    listener(expiredError());

    expect(notifyExpired).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
    release();
  });

  it('登出完成后允许下一次会话失效事件重新触发', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    const notifyExpired = vi.fn();
    const listener = createSessionExpiryListener({ notifyExpired, signOut });

    listener(expiredError());
    await Promise.resolve();
    listener(expiredError());

    expect(signOut).toHaveBeenCalledTimes(2);
  });
});
