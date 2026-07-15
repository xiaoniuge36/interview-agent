import type { CandidateReview } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { resolveReviewCandidateId } from './review-workbench-state';

const CANDIDATE = {
  id: 'candidate-1',
  title: 'React 状态管理',
  status: 'pending',
  qualityScore: 86,
  tags: ['React'],
  sourceRefs: ['source-2'],
  createdAt: '2026-07-14T00:00:00.000Z',
} satisfies CandidateReview;

describe('review workbench selection', () => {
  it('does not open a candidate until an operator explicitly selects one', () => {
    expect(resolveReviewCandidateId([CANDIDATE], null)).toBeNull();
  });

  it('keeps an explicitly selected candidate only while it remains in the queue', () => {
    expect(resolveReviewCandidateId([CANDIDATE], CANDIDATE.id)).toBe(CANDIDATE.id);
    expect(resolveReviewCandidateId([], CANDIDATE.id)).toBeNull();
  });
});
