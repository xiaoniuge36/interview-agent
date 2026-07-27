import type {
  InterviewSession,
  InterviewSessionStatus,
  RecentPracticeSummary,
} from '@interview-agent/contracts';
import { interviewStageLabel } from '@/components/interview/interview-labels';

export type TrainingContinuation = {
  kind: 'practice' | 'interview';
  id: string;
  title: string;
  updatedAt: string;
  href: string;
  kicker: string;
  detail: string;
  actionLabel: string;
  progressPercent: number | null;
  statusLabel: string | null;
};

const PERCENTAGE_TOTAL = 100;
const ACTIVE_INTERVIEW_STATUSES = new Set<InterviewSessionStatus>([
  'running',
  'waiting_user',
  'generating_report',
]);

export function selectTrainingContinuation(
  recentPractice: RecentPracticeSummary | null,
  interviews: InterviewSession[],
): TrainingContinuation | null {
  const practice = recentPractice ? practiceContinuation(recentPractice) : null;
  const activeInterview = latestActiveInterview(interviews);
  const interview = activeInterview ? interviewContinuation(activeInterview) : null;
  if (!practice) return interview;
  if (!interview) return practice;
  return Date.parse(practice.updatedAt) >= Date.parse(interview.updatedAt) ? practice : interview;
}

function latestActiveInterview(interviews: InterviewSession[]): InterviewSession | null {
  return interviews.reduce<InterviewSession | null>((latest, interview) => {
    if (!ACTIVE_INTERVIEW_STATUSES.has(interview.status)) return latest;
    if (!latest || Date.parse(interview.updatedAt) > Date.parse(latest.updatedAt)) return interview;
    return latest;
  }, null);
}

function practiceContinuation(practice: RecentPracticeSummary): TrainingContinuation {
  const progress = Math.round((practice.answeredCount / practice.questionCount) * PERCENTAGE_TOTAL);
  return {
    kind: 'practice',
    id: practice.id,
    title: practice.title,
    updatedAt: practice.updatedAt,
    href: `/practice?session=${encodeURIComponent(practice.id)}`,
    kicker: '继续上次练习',
    detail: `已回答 ${practice.answeredCount}/${practice.questionCount} 题，进度已保留。`,
    actionLabel: '继续练习',
    progressPercent: Math.min(PERCENTAGE_TOTAL, Math.max(0, progress)),
    statusLabel: null,
  };
}

function interviewContinuation(interview: InterviewSession): TrainingContinuation {
  const answered = interview.turns.filter((turn) => turn.role === 'candidate').length;
  return {
    kind: 'interview',
    id: interview.id,
    title: interview.title,
    updatedAt: interview.updatedAt,
    href: `/interview?session=${encodeURIComponent(interview.id)}`,
    kicker: '继续上次模拟',
    detail: `停在${interviewStageLabel(interview.stage)}，已完成 ${answered} 轮回答。`,
    actionLabel: '继续模拟',
    progressPercent: null,
    statusLabel: interviewStatusLabel(interview.status),
  };
}

function interviewStatusLabel(status: InterviewSessionStatus): string {
  if (status === 'waiting_user') return '等待你的回答';
  if (status === 'generating_report') return '复盘生成中';
  return '面试官准备中';
}
