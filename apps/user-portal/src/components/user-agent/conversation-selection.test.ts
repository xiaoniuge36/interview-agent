import { describe, expect, it, vi } from 'vitest';
import {
  createConversationSelectionCleanup,
  createLatestConversationSelectionRunner,
} from './conversation-selection';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('最新对话选择成功竞争', () => {
  it('反序完成时只应用最新成功结果', async () => {
    const older = deferred<string>();
    const latest = deferred<string>();
    const applied: string[] = [];
    const settled = vi.fn();
    const selection = createLatestConversationSelectionRunner();
    const olderRun = selection.run({
      load: () => older.promise,
      onError: vi.fn(),
      onSettled: settled,
      onSuccess: (value) => applied.push(value),
    });
    const latestRun = selection.run({
      load: () => latest.promise,
      onError: vi.fn(),
      onSettled: settled,
      onSuccess: (value) => applied.push(value),
    });

    latest.resolve('conversation-b');
    await expect(latestRun).resolves.toBe(true);
    older.resolve('conversation-a');
    await expect(olderRun).resolves.toBe(false);

    expect(applied).toEqual(['conversation-b']);
    expect(settled).toHaveBeenCalledTimes(1);
  });
});

describe('最新对话选择错误竞争', () => {
  it('忽略晚到的旧请求错误', async () => {
    const older = deferred<string>();
    const latest = deferred<string>();
    const onError = vi.fn();
    const selection = createLatestConversationSelectionRunner();
    const olderRun = selection.run({
      load: () => older.promise,
      onError,
      onSettled: vi.fn(),
      onSuccess: vi.fn(),
    });
    const latestRun = selection.run({
      load: () => latest.promise,
      onError,
      onSettled: vi.fn(),
      onSuccess: vi.fn(),
    });

    latest.resolve('conversation-b');
    await latestRun;
    older.reject(new Error('旧请求失败'));

    await expect(olderRun).resolves.toBe(false);
    expect(onError).not.toHaveBeenCalled();
  });

  it('最新请求失败时报告错误并结束 loading', async () => {
    const reason = new Error('加载失败');
    const onError = vi.fn();
    const onSettled = vi.fn();
    const selection = createLatestConversationSelectionRunner();

    await expect(
      selection.run({
        load: () => Promise.reject(reason),
        onError,
        onSettled,
        onSuccess: vi.fn(),
      }),
    ).resolves.toBe(false);

    expect(onError).toHaveBeenCalledWith(reason);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});

describe('对话选择显式失效', () => {
  it('失效后忽略在途请求的成功和 settlement', async () => {
    const pending = deferred<string>();
    const onSuccess = vi.fn();
    const onSettled = vi.fn();
    const selection = createLatestConversationSelectionRunner();
    const request = selection.run({
      load: () => pending.promise,
      onError: vi.fn(),
      onSettled,
      onSuccess,
    });

    selection.invalidate();
    pending.resolve('stale');

    await expect(request).resolves.toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('卸载 cleanup 会使飞行中的选择请求失效', async () => {
    const pending = deferred<string>();
    const onSuccess = vi.fn();
    const onSettled = vi.fn();
    const selection = createLatestConversationSelectionRunner();
    const request = selection.run({
      load: () => pending.promise,
      onError: vi.fn(),
      onSettled,
      onSuccess,
    });

    createConversationSelectionCleanup(selection)();
    pending.resolve('stale');

    await expect(request).resolves.toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();
  });
});

describe('对话 activation token', () => {
  it('新 invalidate token 使旧 token 失效', () => {
    const selection = createLatestConversationSelectionRunner();

    const older = selection.invalidate();
    const latest = selection.invalidate();

    expect(selection.isCurrent(older)).toBe(false);
    expect(selection.isCurrent(latest)).toBe(true);
  });

  it('新的 selection run 使 create token 失效', async () => {
    const selection = createLatestConversationSelectionRunner();
    const createToken = selection.invalidate();

    const request = selection.run({
      load: () => Promise.resolve('conversation-b'),
      onError: vi.fn(),
      onSettled: vi.fn(),
      onSuccess: vi.fn(),
    });

    expect(selection.isCurrent(createToken)).toBe(false);
    await request;
  });
});
