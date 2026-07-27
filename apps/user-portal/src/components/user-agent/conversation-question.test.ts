import { describe, expect, it, vi } from 'vitest';
import { createPendingAnswerManager } from './conversation-question';

describe('pending answer 正常结算', () => {
  it('回答后清理状态并忽略旧 signal abort', async () => {
    const onQuestionChange = vi.fn();
    const controller = new AbortController();
    const manager = createPendingAnswerManager(onQuestionChange);
    const answer = manager.ask('继续吗？', { signal: controller.signal });

    manager.answer('继续');

    await expect(answer).resolves.toBe('继续');
    expect(onQuestionChange.mock.calls).toEqual([['继续吗？'], [null]]);
    controller.abort(new Error('过期 abort'));
    expect(onQuestionChange).toHaveBeenCalledTimes(2);
  });

  it('显式取消时拒绝 pending Promise', async () => {
    const reason = new Error('对话已切换');
    const manager = createPendingAnswerManager(vi.fn());
    const answer = manager.ask('继续吗？');
    const rejection = expect(answer).rejects.toBe(reason);

    manager.cancel(reason);

    await rejection;
  });
});

describe('pending answer AbortSignal 生命周期', () => {
  it('signal abort 时拒绝并清理问题', async () => {
    const reason = new Error('用户停止');
    const onQuestionChange = vi.fn();
    const controller = new AbortController();
    const manager = createPendingAnswerManager(onQuestionChange);
    const answer = manager.ask('继续吗？', { signal: controller.signal });
    const rejection = expect(answer).rejects.toBe(reason);

    controller.abort(reason);

    await rejection;
    expect(onQuestionChange).toHaveBeenLastCalledWith(null);
  });

  it('已回答问题的旧 signal 不影响后续问题', async () => {
    const oldController = new AbortController();
    const manager = createPendingAnswerManager(vi.fn());
    const first = manager.ask('第一个问题', { signal: oldController.signal });
    manager.answer('第一个答案');
    await first;

    const second = manager.ask('第二个问题');
    oldController.abort(new Error('旧 signal'));
    manager.answer('第二个答案');

    await expect(second).resolves.toBe('第二个答案');
  });

  it('signal 已 abort 时立即拒绝', async () => {
    const reason = new Error('已经停止');
    const controller = new AbortController();
    controller.abort(reason);
    const manager = createPendingAnswerManager(vi.fn());

    await expect(manager.ask('不会展示', { signal: controller.signal })).rejects.toBe(reason);
  });
});
