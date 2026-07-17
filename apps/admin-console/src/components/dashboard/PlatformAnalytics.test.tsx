import type { PlatformDashboard } from '@interview-agent/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PlatformAnalyticsContent } from './PlatformAnalytics';

const dashboard: PlatformDashboard = {
  period: '7d',
  range: { startAt: '2026-07-09T00:00:00.000Z', endAt: '2026-07-16T00:00:00.000Z' },
  accounts: { total: 8, created: 3, active: 2, disabled: 1, tenants: 5, admin: 2, users: 6 },
  content: { imports: 4, pendingCandidates: 3, publishedQuestions: 7, failedImports: 1 },
  training: { interviews: 6, reports: 4, practiceSubmissions: 5, practiceReports: 3 },
  runtime: {
    runs: 10,
    successRate: 80,
    schemaPassRate: 75,
    averageLatencyMs: 342,
    fallbacks: 1,
    recentFailures: [],
  },
  trend: [
    {
      date: '2026-07-15',
      accountsCreated: 1,
      questionsPublished: 2,
      trainingCompleted: 3,
      agentRuns: 4,
    },
    {
      date: '2026-07-16',
      accountsCreated: 2,
      questionsPublished: 1,
      trainingCompleted: 2,
      agentRuns: 5,
    },
  ],
  funnel: {
    imports: 4,
    pendingCandidates: 3,
    publishedQuestions: 7,
    practiceSubmissions: 5,
    practiceReports: 3,
  },
  alerts: [{ code: 'review_backlog', severity: 'warning', count: 3 }],
};

describe('PlatformAnalyticsContent', () => {
  it('renders the light BI operating overview with real dashboard metrics', () => {
    const markup = renderToStaticMarkup(createElement(PlatformAnalyticsContent, { dashboard }));

    expect(markup).toContain('运营概览');
    expect(markup).toContain('经营趋势');
    expect(markup).toContain('内容与训练链路');
    expect(markup).toContain('运行质量');
    expect(markup).toContain('近期运行风险');
    expect(markup).toContain('候选题待审核');
    expect(markup).toContain('342');
  });
});
