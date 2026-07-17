import type { PlatformDashboard, PlatformTrendPoint } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { toFunnelChartData, toTrendChartData } from './platform-bi-model';

const trend: PlatformTrendPoint[] = [
  {
    date: '2026-07-16',
    accountsCreated: 2,
    questionsPublished: 3,
    trainingCompleted: 1,
    agentRuns: 4,
  },
];

const funnel: PlatformDashboard['funnel'] = {
  imports: 5,
  pendingCandidates: 21,
  publishedQuestions: 4,
  practiceSubmissions: 2,
  practiceReports: 2,
};

describe('platform BI model', () => {
  it('maps selected trend data to a readable chart series', () => {
    expect(toTrendChartData(trend, 'agentRuns')).toEqual([
      { date: '07/16', metric: 'Agent 调用', value: 4 },
    ]);
  });

  it('keeps funnel stages and risk tones explicit', () => {
    expect(toFunnelChartData(funnel)[1]).toMatchObject({
      stage: '待审核存量',
      value: 21,
      tone: 'warning',
    });
  });
});
