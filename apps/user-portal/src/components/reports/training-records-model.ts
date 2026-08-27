import type {
  InterviewReport,
  InterviewSessionSummary,
  PracticeHistoryItem,
} from '@interview-agent/contracts';
import { interviewStageLabel } from '@/components/interview/interview-labels';

const ACTIONABLE_INTERVIEW_SCORE = 70;
const INTERVIEW_SIGNAL_LIMIT = 2;
const ACTIVE_STATUSES = new Set(['created', 'in_progress', 'running', 'waiting_user']);
const REPORTING_STATUSES = new Set(['submitted', 'generating_report']);

export const TRAINING_ARCHIVE_PAGE_SIZE = 10;

export type TrainingRecordFilter = 'all' | 'practice' | 'interview';
export type TrainingRecordPage = {
  items: TrainingRecord[];
  page: number;
  totalPages: number;
  total: number;
};
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
  trend: { delta: number; previousScore: number } | null;
};

export function buildTrainingRecords(
  practices: PracticeHistoryItem[],
  interviews: InterviewSessionSummary[],
  interviewReports: InterviewReport[] = [],
): TrainingRecord[] {
  const reports = new Map(interviewReports.map((report) => [report.sessionId, report]));
  const records = [
    ...practices.map(practiceRecord),
    ...interviews.map((interview) => interviewRecord(interview, reports.get(interview.id))),
  ].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  return addScoreTrends(records);
}

export function filterTrainingRecords(records: TrainingRecord[], filter: TrainingRecordFilter) {
  return filter === 'all' ? records : records.filter((record) => record.kind === filter);
}

export function searchTrainingRecords(records: TrainingRecord[], query: string) {
  const keyword = query.trim().toLocaleLowerCase('zh-CN');
  if (!keyword) return records;
  return records.filter((record) => trainingRecordSearchText(record).includes(keyword));
}

export function paginateTrainingRecords(
  records: TrainingRecord[],
  page: number,
  pageSize = TRAINING_ARCHIVE_PAGE_SIZE,
): TrainingRecordPage {
  const total = records.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.trunc(page)), totalPages);
  const start = (current - 1) * pageSize;
  return { items: records.slice(start, start + pageSize), page: current, totalPages, total };
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
  if (ACTIVE_STATUSES.has(status)) return '进行中';
  if (REPORTING_STATUSES.has(status)) return '报告生成中';
  if (status === 'failed') return '已中断';
  if (status === 'cancelled') return '已取消';
  return '已保存';
}

/** 档案不仅用于回看：进行中的训练要能一键回到现场继续。 */
export function trainingRecordActionLabel(status: string) {
  if (ACTIVE_STATUSES.has(status)) return '继续训练';
  if (REPORTING_STATUSES.has(status)) return '查看进度';
  if (status === 'report_ready') return '查看复盘';
  return '查看记录';
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
    trend: null,
  };
}

function interviewRecord(item: InterviewSessionSummary, report?: InterviewReport): TrainingRecord {
  return {
    id: item.id,
    kind: 'interview',
    title: item.title,
    updatedAt: item.updatedAt,
    status: item.status,
    href: `/interview?session=${item.id}`,
    score: report?.overall.score ?? null,
    facts: [`${item.turnCount ?? 0} 轮交流`],
    signals: report ? interviewSignals(report) : [],
    trend: null,
  };
}

function interviewSignals(report: InterviewReport) {
  return [...report.stageScores]
    .filter((stage) => stage.score < ACTIONABLE_INTERVIEW_SCORE)
    .sort((left, right) => left.score - right.score)
    .slice(0, INTERVIEW_SIGNAL_LIMIT)
    .map((stage) => `${interviewStageLabel(stage.stage)} ${Math.round(stage.score)} 分`);
}

function addScoreTrends(records: TrainingRecord[]) {
  const previousScores = new Map<TrainingRecord['kind'], number>();
  return [...records]
    .reverse()
    .map((record) => {
      const previousScore = previousScores.get(record.kind);
      const trend =
        record.score !== null && previousScore !== undefined
          ? { delta: Math.round(record.score - previousScore), previousScore }
          : null;
      if (record.score !== null) previousScores.set(record.kind, record.score);
      else previousScores.delete(record.kind);
      return { ...record, trend };
    })
    .reverse();
}
