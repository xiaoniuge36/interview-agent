import type { PracticeReport } from '@interview-agent/contracts';
import { expect, it, vi } from 'vitest';
import type { createPracticeSession } from './practice-api';
import {
  createWeaknessReviewSession,
  hasReviewableWeakness,
  startWeaknessReview,
} from './weakness-review';

it('treats scores below sixty as reviewable weaknesses', () => {
  expect(hasReviewableWeakness(reportWithScores(59))).toBe(true);
  expect(hasReviewableWeakness(reportWithScores(60))).toBe(false);
  expect(hasReviewableWeakness(null)).toBe(false);
});

it('creates a weakness review session with the existing practice contract', async () => {
  const createSession = vi
    .fn()
    .mockResolvedValue({ id: 'review-session' }) as unknown as typeof createPracticeSession;

  await expect(createWeaknessReviewSession(createSession)).resolves.toBe('review-session');
  expect(createSession).toHaveBeenCalledWith({
    title: '薄弱项复练',
    mode: 'weakness_review',
  });
});

it('keeps creation locked after success while navigation takes over', async () => {
  const setStarting = vi.fn();
  const onSuccess = vi.fn();

  await startWeaknessReview({
    createSession: vi
      .fn()
      .mockResolvedValue({ id: 'review-session' }) as unknown as typeof createPracticeSession,
    setStarting,
    onSuccess,
    onError: vi.fn(),
  });

  expect(setStarting.mock.calls).toEqual([[true]]);
  expect(onSuccess).toHaveBeenCalledWith('review-session');
});

it('unlocks creation after a failure', async () => {
  const failure = new Error('unavailable');
  const setStarting = vi.fn();
  const onError = vi.fn();

  await startWeaknessReview({
    createSession: vi.fn().mockRejectedValue(failure) as unknown as typeof createPracticeSession,
    setStarting,
    onSuccess: vi.fn(),
    onError,
  });

  expect(setStarting.mock.calls).toEqual([[true], [false]]);
  expect(onError).toHaveBeenCalledWith(failure);
});

function reportWithScores(...scores: number[]) {
  return {
    itemEvaluations: scores.map((score, index) => ({ id: `evaluation-${index}`, score })),
  } as PracticeReport;
}
