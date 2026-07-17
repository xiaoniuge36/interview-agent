import type { PlatformDashboard, PlatformTrendPoint } from '@interview-agent/contracts';
import type { TrendMetric } from './platform-analytics-model';

const ISO_DATE_PREFIX_LENGTH = 5;

const TREND_LABELS: Record<TrendMetric, string> = {
  agentRuns: 'Agent 调用',
  trainingCompleted: '训练完成',
  questionsPublished: '新增发布题',
  accountsCreated: '新增账号',
};

export function toTrendChartData(points: PlatformTrendPoint[], metric: TrendMetric) {
  return points.map((point) => ({
    date: formatDate(point.date),
    metric: TREND_LABELS[metric],
    value: point[metric],
  }));
}

export function toFunnelChartData(funnel: PlatformDashboard['funnel']) {
  return [
    { stage: '窗口导入', value: funnel.imports, tone: 'neutral' },
    { stage: '待审核存量', value: funnel.pendingCandidates, tone: 'warning' },
    { stage: '已发布题目', value: funnel.publishedQuestions, tone: 'info' },
    { stage: '训练提交', value: funnel.practiceSubmissions, tone: 'neutral' },
    { stage: '练习报告', value: funnel.practiceReports, tone: 'success' },
  ];
}

function formatDate(value: string) {
  return value.slice(ISO_DATE_PREFIX_LENGTH).replace('-', '/');
}
