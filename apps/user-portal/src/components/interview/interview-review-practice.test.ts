import { describe, expect, it } from 'vitest';
import { createInterviewReviewRequest, interviewReviewFocus } from './interview-review-practice';

describe('interview review practice model', () => {
  it('keeps the two lowest actionable report stages in score order', () => {
    expect(
      interviewReviewFocus({
        stageScores: [
          { stage: 'jd_core', score: 58, summary: '核心知识不完整。', evidence: ['缺少边界'] },
          {
            stage: 'project_deep_dive',
            score: 42,
            summary: '项目证据链不足。',
            evidence: ['没有量化结果'],
          },
          { stage: 'hr', score: 76, summary: '表达清晰。', evidence: ['职责明确'] },
        ],
      } as never),
    ).toEqual([
      {
        stage: 'project_deep_dive',
        label: '项目深挖',
        score: 42,
        summary: '项目证据链不足。',
        evidence: ['没有量化结果'],
      },
      {
        stage: 'jd_core',
        label: '岗位核心能力',
        score: 58,
        summary: '核心知识不完整。',
        evidence: ['缺少边界'],
      },
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
