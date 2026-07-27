import type { createPracticeSession } from '@/lib/practice-api';
import type { getPracticeRecommendations } from '@/lib/question-catalog-api';
import { expect, it, vi } from 'vitest';
import {
  createExclusivePracticeContinuationRunner,
  startNextRecommendedPractice,
} from './practice-continuation';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

it('共享 runner 阻止重复与冲突创建，结算后允许重试', async () => {
  const pending = deferred();
  const recommendation = vi.fn(() => pending.promise);
  const weaknessReview = vi.fn(() => Promise.resolve());
  const run = createExclusivePracticeContinuationRunner();

  const owner = run(recommendation);
  const duplicate = run(recommendation);
  const conflicting = run(weaknessReview);

  expect(recommendation).toHaveBeenCalledTimes(1);
  await expect(duplicate).resolves.toBe(false);
  await expect(conflicting).resolves.toBe(false);
  expect(weaknessReview).not.toHaveBeenCalled();
  pending.resolve();
  await expect(owner).resolves.toBe(true);
  await expect(run(weaknessReview)).resolves.toBe(true);
});

it('runner 在命令拒绝时传播错误并释放锁', async () => {
  const reason = new Error('创建失败');
  const run = createExclusivePracticeContinuationRunner();

  await expect(run(() => Promise.reject(reason))).rejects.toBe(reason);
  await expect(run(() => Promise.resolve())).resolves.toBe(true);
});

it('推荐创建成功后保持跳转锁并透传新 session', async () => {
  const setStarting = vi.fn();
  const onSuccess = vi.fn();
  const createSession = vi
    .fn()
    .mockResolvedValue({ id: 'next-session' }) as unknown as typeof createPracticeSession;

  await startNextRecommendedPractice({
    loadRecommendations: vi
      .fn()
      .mockResolvedValue([
        { title: '并发专项', questionIds: ['question-1', 'question-2'] },
      ]) as unknown as typeof getPracticeRecommendations,
    createSession,
    setStarting,
    onSuccess,
    onError: vi.fn(),
  });

  expect(setStarting.mock.calls).toEqual([[true]]);
  expect(createSession).toHaveBeenCalledWith({
    title: '并发专项',
    mode: 'manual',
    questionIds: ['question-1', 'question-2'],
  });
  expect(onSuccess).toHaveBeenCalledWith('next-session');
});

it('推荐不可用或创建失败时恢复按钮并报告错误', async () => {
  const setStarting = vi.fn();
  const onError = vi.fn();

  await startNextRecommendedPractice({
    loadRecommendations: vi
      .fn()
      .mockResolvedValue([]) as unknown as typeof getPracticeRecommendations,
    createSession: vi.fn() as unknown as typeof createPracticeSession,
    setStarting,
    onSuccess: vi.fn(),
    onError,
  });

  expect(setStarting.mock.calls).toEqual([[true], [false]]);
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'RECOMMENDATION_UNAVAILABLE' }),
  );
});
