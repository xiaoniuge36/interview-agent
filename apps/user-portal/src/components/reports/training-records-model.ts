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

export function searchTrainingRecords(records: TrainingRecord[], query: string) {
  const keyword = query.trim().toLocaleLowerCase('zh-CN');
  if (!keyword) return records;
  return records.filter((record) => trainingRecordSearchText(record).includes(keyword));
}

export function formatTrainingRecordDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function summarizeTrainingRecords(records: TrainingRecord[]) {
  return {
    total: records.length,
    practice: records.filter((record) => record.kind === 'practice').length,
    interview: records.filter((record) => record.kind === 'interview').length,
    reviewed: records.filter((record) => record.status === 'report_ready').length,
  };
}

function trainingRecordSearchText(record: TrainingRecord) {
  return [
    record.title,
    record.kind === 'practice' ? '刷题 练习' : '模拟面试 面试',
    record.status,
    trainingRecordStatusLabel(record.status),
    ...record.facts,
    ...record.signals,
  ]
    .join(' ')
    .toLocaleLowerCase('zh-CN');
}

export function trainingRecordStatusLabel(status: string) {
  if (status === 'report_ready') return '复盘已完成';
  if (status === 'in_progress' || status === 'waiting_user') return '进行中';
  if (status === 'submitted' || status === 'generating_report') return '报告生成中';
  return '已保存';
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
