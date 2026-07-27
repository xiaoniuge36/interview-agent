import { describe, expect, it, vi } from 'vitest';
import {
  createExclusiveInterviewReviewPracticeRunner,
  startInterviewReviewPractice,
} from './interview-review-practice-runner';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('面试专项回练创建流程', () => {
  it('成功创建后才跳转到新练习', async () => {
    const createSession = vi.fn().mockResolvedValue({ id: 'practice-1' });
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await startInterviewReviewPractice({
      sessionId: 'interview-1',
      createSession,
      onSuccess,
      onError,
    });

    expect(createSession).toHaveBeenCalledWith({
      mode: 'interview_review',
      sourceInterviewSessionId: 'interview-1',
    });
    expect(onSuccess).toHaveBeenCalledWith('practice-1');
    expect(onError).not.toHaveBeenCalled();
  });

  it('创建失败时保留当前报告并报告错误', async () => {
    const error = new Error('没有可用题目');
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await startInterviewReviewPractice({
      sessionId: 'interview-1',
      createSession: vi.fn().mockRejectedValue(error),
      onSuccess,
      onError,
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('重复点击只发起一个创建请求，并在结束后释放锁', async () => {
    const pending = deferred();
    const action = vi.fn(() => pending.promise);
    const run = createExclusiveInterviewReviewPracticeRunner();

    const first = run(action);
    const duplicate = run(action);

    expect(action).toHaveBeenCalledTimes(1);
    await expect(duplicate).resolves.toBe(false);
    pending.resolve();
    await expect(first).resolves.toBe(true);
    await expect(run(action)).resolves.toBe(true);
  });
});
