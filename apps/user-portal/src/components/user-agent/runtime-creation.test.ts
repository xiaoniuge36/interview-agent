import { describe, expect, it, vi } from 'vitest';
import { runRuntimeCreation } from './runtime-creation';

function handlers(disposed = false) {
  return {
    fallbackMessage: '无法启动 AI 刷题教练。',
    isDisposed: () => disposed,
    onDispose: vi.fn(),
    onError: vi.fn(),
    onReady: vi.fn(),
  };
}

describe('runtime creation 成功结算', () => {
  it('当前 lifecycle 发布 runtime', async () => {
    const runtime = { id: 'runtime-a' };
    const events = handlers();

    await expect(
      runRuntimeCreation({ ...events, create: () => Promise.resolve(runtime) }),
    ).resolves.toBe(true);
    expect(events.onReady).toHaveBeenCalledWith(runtime);
    expect(events.onDispose).not.toHaveBeenCalled();
  });

  it('已 disposed lifecycle 释放 runtime', async () => {
    const runtime = { id: 'runtime-a' };
    const events = handlers(true);

    await expect(
      runRuntimeCreation({ ...events, create: () => Promise.resolve(runtime) }),
    ).resolves.toBe(false);
    expect(events.onDispose).toHaveBeenCalledWith(runtime);
    expect(events.onReady).not.toHaveBeenCalled();
  });
});

describe('runtime creation 失败结算', () => {
  it('当前 Error 失败显示真实 message', async () => {
    const events = handlers();

    await expect(
      runRuntimeCreation({ ...events, create: () => Promise.reject(new Error('模型不可用')) }),
    ).resolves.toBe(false);
    expect(events.onError).toHaveBeenCalledWith('模型不可用');
  });

  it('当前非 Error 失败显示 fallback', async () => {
    const events = handlers();

    await expect(
      runRuntimeCreation({ ...events, create: () => Promise.reject('unavailable') }),
    ).resolves.toBe(false);
    expect(events.onError).toHaveBeenCalledWith('无法启动 AI 刷题教练。');
  });

  it('已 disposed lifecycle 忽略失败', async () => {
    const events = handlers(true);

    await expect(
      runRuntimeCreation({ ...events, create: () => Promise.reject(new Error('旧失败')) }),
    ).resolves.toBe(false);
    expect(events.onError).not.toHaveBeenCalled();
  });
});
