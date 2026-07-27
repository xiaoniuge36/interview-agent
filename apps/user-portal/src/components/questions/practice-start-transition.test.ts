import type { createPracticeSession } from '@/lib/practice-api';
import { expect, it, vi } from 'vitest';
import { startQuestionPractice, type PracticeStartInput } from './practice-start-single-flight';

const input: PracticeStartInput = {
  key: 'selection',
  title: '自选专项',
  questionIds: ['question-1', 'question-2'],
  failureMessage: '题单创建失败',
};

it('自主选题创建成功后保持跳转锁并透传 session', async () => {
  const setBusyKey = vi.fn();
  const onSuccess = vi.fn();
  const createSession = vi
    .fn()
    .mockResolvedValue({ id: 'practice-session' }) as unknown as typeof createPracticeSession;

  await startQuestionPractice({
    input,
    createSession,
    setBusyKey,
    onSuccess,
    onError: vi.fn(),
  });

  expect(setBusyKey.mock.calls).toEqual([['selection']]);
  expect(createSession).toHaveBeenCalledWith({
    title: '自选专项',
    mode: 'manual',
    questionIds: ['question-1', 'question-2'],
  });
  expect(onSuccess).toHaveBeenCalledWith('practice-session');
});

it('自主选题创建失败时恢复入口并透传错误', async () => {
  const reason = new Error('服务不可用');
  const setBusyKey = vi.fn();
  const onError = vi.fn();

  await startQuestionPractice({
    input,
    createSession: vi.fn().mockRejectedValue(reason) as unknown as typeof createPracticeSession,
    setBusyKey,
    onSuccess: vi.fn(),
    onError,
  });

  expect(setBusyKey.mock.calls).toEqual([['selection'], [null]]);
  expect(onError).toHaveBeenCalledWith(reason);
});
