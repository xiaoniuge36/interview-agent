import type { PracticeRecommendation } from '@interview-agent/contracts';
import type { createPracticeSession } from '@/lib/practice-api';
import { expect, it, vi } from 'vitest';
import {
  createExclusiveHomeRecommendationStartRunner,
  startHomeRecommendation,
} from './home-recommendation-start';

const recommendation = {
  id: 'recommendation-1',
  title: '并发专项训练',
  questionIds: ['question-1', 'question-2'],
} as PracticeRecommendation;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

it('Home 推荐 runner 阻止重复创建，结算后允许重试', async () => {
  const pending = deferred();
  const action = vi.fn(() => pending.promise);
  const run = createExclusiveHomeRecommendationStartRunner();

  const owner = run(action);
  const duplicate = run(action);

  expect(action).toHaveBeenCalledTimes(1);
  await expect(duplicate).resolves.toBe(false);
  pending.resolve();
  await expect(owner).resolves.toBe(true);
  await expect(run(() => Promise.resolve())).resolves.toBe(true);
});

it('Home 推荐 runner 在命令拒绝时传播错误并释放锁', async () => {
  const reason = new Error('创建失败');
  const run = createExclusiveHomeRecommendationStartRunner();

  await expect(run(() => Promise.reject(reason))).rejects.toBe(reason);
  await expect(run(() => Promise.resolve())).resolves.toBe(true);
});

it('Home 推荐创建成功后保持跳转锁并透传 session', async () => {
  const setBusyRecommendationId = vi.fn();
  const onSuccess = vi.fn();
  const createSession = vi
    .fn()
    .mockResolvedValue({ id: 'practice-session' }) as unknown as typeof createPracticeSession;

  await startHomeRecommendation({
    recommendation,
    createSession,
    setBusyRecommendationId,
    onSuccess,
    onError: vi.fn(),
  });

  expect(setBusyRecommendationId.mock.calls).toEqual([['recommendation-1']]);
  expect(createSession).toHaveBeenCalledWith({
    title: '并发专项训练',
    mode: 'manual',
    questionIds: ['question-1', 'question-2'],
  });
  expect(onSuccess).toHaveBeenCalledWith('practice-session');
});

it('Home 推荐创建失败时恢复按钮并报告错误', async () => {
  const reason = new Error('服务不可用');
  const setBusyRecommendationId = vi.fn();
  const onError = vi.fn();

  await startHomeRecommendation({
    recommendation,
    createSession: vi.fn().mockRejectedValue(reason) as unknown as typeof createPracticeSession,
    setBusyRecommendationId,
    onSuccess: vi.fn(),
    onError,
  });

  expect(setBusyRecommendationId.mock.calls).toEqual([['recommendation-1'], [null]]);
  expect(onError).toHaveBeenCalledWith(reason);
});
