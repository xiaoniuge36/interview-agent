import type { PracticeReport, PracticeSession } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { buildInterviewReviewEvidence } from './interview-review-evidence';

const session = {
  id: 'practice-review-1',
  sourceInterviewSessionId: 'interview-source-1',
  status: 'report_ready',
} as PracticeSession;

const report = {
  overallScore: 76,
  weaknesses: ['恢复验证', '降级条件'],
  nextActions: ['补充故障演练'],
} as PracticeReport;

describe('interview review evidence bridge', () => {
  it('accepts only a completed practice sourced from the current interview', () => {
    expect(buildInterviewReviewEvidence(session, 'interview-source-1', report)).toEqual({
      practiceSessionId: 'practice-review-1',
      score: 76,
      weaknesses: ['恢复验证', '降级条件'],
      nextActions: ['补充故障演练'],
    });
  });

  it('rejects a mismatched source or incomplete practice without inventing evidence', () => {
    expect(buildInterviewReviewEvidence(session, 'other-interview', report)).toBeNull();
    expect(
      buildInterviewReviewEvidence(
        { ...session, status: 'in_progress' },
        'interview-source-1',
        report,
      ),
    ).toBeNull();
    expect(buildInterviewReviewEvidence(session, 'interview-source-1', null)).toBeNull();
  });
});
