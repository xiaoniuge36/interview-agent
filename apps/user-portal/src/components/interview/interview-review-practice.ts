import type { InterviewReport, InterviewStage } from '@interview-agent/contracts';
import { interviewStageLabel } from './interview-labels';

const ACTIONABLE_SCORE = 70;
const FOCUS_LIMIT = 2;
const REVIEWABLE_STAGES = new Set<InterviewStage>([
  'self_intro',
  'tech_basics',
  'jd_core',
  'project_deep_dive',
  'scenario_design',
  'hr',
]);

export function interviewReviewFocus(report: Pick<InterviewReport, 'stageScores'>) {
  return report.stageScores
    .filter((item) => REVIEWABLE_STAGES.has(item.stage) && item.score < ACTIONABLE_SCORE)
    .sort((left, right) => left.score - right.score)
    .slice(0, FOCUS_LIMIT)
    .map((item) => ({
      stage: item.stage,
      label: interviewStageLabel(item.stage),
      score: item.score,
    }));
}

export function createInterviewReviewRequest(sourceInterviewSessionId: string) {
  return { mode: 'interview_review' as const, sourceInterviewSessionId };
}
