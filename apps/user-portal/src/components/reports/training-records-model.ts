import type { InterviewSession, PracticeHistoryItem } from '@interview-agent/contracts';

export type TrainingRecordFilter = 'all' | 'practice' | 'interview';
export type TrainingRecord = {
  id: string;
  kind: Exclude<TrainingRecordFilter, 'all'>;
  title: string;
  updatedAt: string;
  status: string;
  href: string;
  score: number | null;
  facts: string[];
  signals: string[];
};

export function buildTrainingRecords(
  practices: PracticeHistoryItem[],
  interviews: InterviewSession[],
): TrainingRecord[] {
  return [...practices.map(practiceRecord), ...interviews.map(interviewRecord)].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  );
}

export function filterTrainingRecords(records: TrainingRecord[], filter: TrainingRecordFilter) {
  return filter === 'all' ? records : records.filter((record) => record.kind === filter);
}

function practiceRecord(item: PracticeHistoryItem): TrainingRecord {
  return {
    id: item.id,
    kind: 'practice',
    title: item.title,
    updatedAt: item.updatedAt,
    status: item.status,
    href: `/practice?session=${item.id}`,
    score: item.overallScore,
    facts: [
      `${item.questionCount} 道题`,
      `已答 ${item.answeredCount}`,
      `已评 ${item.evaluatedCount}`,
    ],
    signals: item.weaknesses.slice(0, 2),
  };
}

function interviewRecord(item: InterviewSession): TrainingRecord {
  return {
    id: item.id,
    kind: 'interview',
    title: item.title,
    updatedAt: item.updatedAt,
    status: item.status,
    href: `/interview?session=${item.id}`,
    score: null,
    facts: [`${item.turns?.length ?? 0} 轮交流`],
    signals: [],
  };
}
