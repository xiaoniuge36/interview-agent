import { describe, expect, it } from 'vitest';
import { createInterviewReviewRequest, interviewReviewFocus } from './interview-review-practice';

describe('interview review practice model', () => {
  it('keeps the two lowest actionable report stages in score order', () => {
    expect(
      interviewReviewFocus({
        stageScores: [
          { stage: 'jd_core', score: 58 },
          { stage: 'project_deep_dive', score: 42 },
          { stage: 'hr', score: 76 },
        ],
      } as never),
    ).toEqual([
      { stage: 'project_deep_dive', label: '项目深挖', score: 42 },
      { stage: 'jd_core', label: '岗位核心能力', score: 58 },
    ]);
  });

  it('does not expose stages at or above the actionable score', () => {
    expect(
      interviewReviewFocus({ stageScores: [{ stage: 'jd_core', score: 70 }] } as never),
    ).toEqual([]);
  });

  it('creates the source-bound practice request without question ids', () => {
    expect(createInterviewReviewRequest('interview-1')).toEqual({
      mode: 'interview_review',
      sourceInterviewSessionId: 'interview-1',
    });
  });
});
