import type { ThemePreferences, UserPreferencePayload } from '@interview-agent/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  createLatestThemePreferenceQueue,
  synchronizeInitialPreferences,
} from './theme-preferences-sync';

describe('用户主题偏好首次同步', () => {
  it('服务端已有记录时覆盖本地偏好', async () => {
    const write = vi.fn();

    await expect(
      synchronizeInitialPreferences(
        { theme: 'daylight', motion: true },
        async () => payload('aurora', false),
        write,
      ),
    ).resolves.toEqual({
      preferences: { theme: 'aurora', motion: false },
      source: 'server',
    });
    expect(write).not.toHaveBeenCalled();
  });

  it('服务端没有记录时上传当前本地偏好', async () => {
    const write = vi.fn().mockResolvedValue(payload('glass', true));

    await expect(
      synchronizeInitialPreferences(
        { theme: 'glass', motion: true },
        async () => ({ preferences: null }),
        write,
      ),
    ).resolves.toEqual({
      preferences: { theme: 'glass', motion: true },
      source: 'local-upload',
    });
    expect(write).toHaveBeenCalledWith({ theme: 'glass', motion: true });
  });

  it('读取或首次上传失败时保留本地偏好', async () => {
    const local = { theme: 'playground', motion: false } as const;

    await expect(
      synchronizeInitialPreferences(
        local,
        async () => Promise.reject(new Error('offline')),
        vi.fn(),
      ),
    ).resolves.toEqual({ preferences: local, source: 'local-fallback' });
    await expect(
      synchronizeInitialPreferences(
        local,
        async () => ({ preferences: null }),
        async () => Promise.reject(new Error('offline')),
      ),
    ).resolves.toEqual({ preferences: local, source: 'local-fallback' });
  });
});

describe('用户主题偏好保存队列', () => {
  it('串行保存并跳过中间值，只落最后一次选择', async () => {
    const calls: ThemePreferences[] = [];
    const first = deferred<void>();
    const queue = createLatestThemePreferenceQueue(async (preferences) => {
      calls.push(preferences);
      if (calls.length === 1) await first.promise;
    });

    queue.enqueue({ theme: 'aurora', motion: true });
    queue.enqueue({ theme: 'terminal', motion: true });
    queue.enqueue({ theme: 'glass', motion: false });
    first.resolve();
    await queue.idle();

    expect(calls).toEqual([
      { theme: 'aurora', motion: true },
      { theme: 'glass', motion: false },
    ]);
  });

  it('失败后停止循环，并在下次变更时重试最新值', async () => {
    const save = vi
      .fn<(preferences: ThemePreferences) => Promise<void>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    const queue = createLatestThemePreferenceQueue(save);

    queue.enqueue({ theme: 'aurora', motion: true });
    await queue.idle();
    queue.enqueue({ theme: 'daylight', motion: false });
    await queue.idle();

    expect(save).toHaveBeenNthCalledWith(1, { theme: 'aurora', motion: true });
    expect(save).toHaveBeenNthCalledWith(2, { theme: 'daylight', motion: false });
  });

  it('重置时丢弃旧账号尚未发送的待保存值', async () => {
    const calls: ThemePreferences[] = [];
    const first = deferred<void>();
    const queue = createLatestThemePreferenceQueue(async (preferences) => {
      calls.push(preferences);
      if (calls.length === 1) await first.promise;
    });

    queue.enqueue({ theme: 'aurora', motion: true });
    queue.enqueue({ theme: 'terminal', motion: false });
    queue.reset();
    first.resolve();
    queue.enqueue({ theme: 'playground', motion: true });
    await queue.idle();

    expect(calls).toEqual([
      { theme: 'aurora', motion: true },
      { theme: 'playground', motion: true },
    ]);
  });
});

function payload(theme: ThemePreferences['theme'], motion: boolean): UserPreferencePayload {
  return {
    preferences: {
      id: 'preference-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      theme,
      motion,
      updatedAt: '2026-08-17T00:00:00.000Z',
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
