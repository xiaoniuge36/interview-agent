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
};

describe('PlatformAnalyticsContent', () => {
  it('renders actual platform account, content, training, and runtime metrics', () => {
    const markup = renderToStaticMarkup(createElement(PlatformAnalyticsContent, { dashboard }));

    expect(markup).toContain('账号概况');
    expect(markup).toContain('内容漏斗');
    expect(markup).toContain('训练业务');
    expect(markup).toContain('Agent 健康');
    expect(markup).toContain('已注册账号');
    expect(markup).toContain('342');
  });
});
