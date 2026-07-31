import type { PracticeReport, PracticeSession } from '@interview-agent/contracts';

const MAX_EVIDENCE_ITEMS = 3;

export type InterviewReviewEvidence = {
  practiceSessionId: string;
  score: number;
  weaknesses: string[];
  nextActions: string[];
};

export function buildInterviewReviewEvidence(
  session: Pick<PracticeSession, 'id' | 'status' | 'sourceInterviewSessionId'>,
  sourceInterviewSessionId: string | null,
  report: Pick<PracticeReport, 'overallScore' | 'weaknesses' | 'nextActions'> | null,
): InterviewReviewEvidence | null {
  if (
    session.status !== 'report_ready' ||
    !report ||
    !sourceInterviewSessionId ||
    session.sourceInterviewSessionId !== sourceInterviewSessionId
  ) {
    return null;
  }
  return {
    practiceSessionId: session.id,
    score: report.overallScore,
    weaknesses: report.weaknesses.slice(0, MAX_EVIDENCE_ITEMS),
    nextActions: report.nextActions.slice(0, MAX_EVIDENCE_ITEMS),
  };
}
