import type { PracticeReport, PracticeSession } from '@interview-agent/contracts';
import {
  persistLatestLearningVerification,
  type LearningProgressStorage,
} from '@/lib/learning/learning-progress';
import type { PracticeReturnOrigin } from './practice-return-origin';

export type LearningPracticeOrigin = Pick<
  Extract<PracticeReturnOrigin, { status: 'ready' }>,
  'status' | 'courseSlug' | 'topicLabel'
>;

type PersistLearningPracticeEvidenceInput = {
  origin: LearningPracticeOrigin | null;
  session: PracticeSession | null;
  report: PracticeReport | null;
  storage: LearningProgressStorage | null;
};

export function persistLearningPracticeEvidence(
  input: PersistLearningPracticeEvidenceInput,
): boolean {
  const evidence = learningPracticeEvidence(input);
  return evidence
    ? persistLatestLearningVerification(input.storage, evidence.courseSlug, evidence.verification)
    : false;
}

function learningPracticeEvidence(input: PersistLearningPracticeEvidenceInput) {
  const origin = input.origin;
  const facts = trustedLearningFacts(input.session, input.report);
  if (!origin || origin.status !== 'ready' || !facts) return null;
  return {
    courseSlug: origin.courseSlug,
    verification: {
      sessionId: facts.session.id,
      topic: origin.topicLabel,
      score: facts.report.overallScore,
      answerCount: facts.session.items.filter((item) => item.answer?.trim()).length,
      recordedAt: facts.report.updatedAt,
    },
  };
}

function trustedLearningFacts(session: PracticeSession | null, report: PracticeReport | null) {
  if (!session || !report || session.mode === 'interview_review') return false;
  if (session.status !== 'report_ready') return false;
  if (report.sessionId !== session.id || report.tenantId !== session.tenantId) return false;
  if (!Number.isFinite(report.overallScore) || Number.isNaN(Date.parse(report.updatedAt)))
    return null;
  return { session, report };
}
