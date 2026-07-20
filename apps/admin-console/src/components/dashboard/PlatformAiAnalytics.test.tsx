import type { PlatformAiAnalytics } from '@interview-agent/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PlatformAiAnalyticsContent } from './PlatformAiAnalytics';

const analytics: PlatformAiAnalytics = {
  period: '7d',
  range: { startAt: '2026-07-10T00:00:00.000Z', endAt: '2026-07-17T00:00:00.000Z' },
  filters: { provider: null, operation: null },
  totals: {
    invocations: 6,
    succeeded: 5,
    failed: 1,
    cancelled: 0,
    successRate: 83.33,
    averageLatencyMs: 320,
    totalTokens: 120,
    usageAvailable: true,
  },
  byModel: [
    {
      provider: 'deepseek',
      model: 'deepseek-chat',
      invocations: 6,
      succeeded: 5,
      failed: 1,
      cancelled: 0,
      totalTokens: 120,
    },
  ],
  byOperation: [
    {
      operation: 'practice_evaluation',
      invocations: 6,
      succeeded: 5,
      failed: 1,
      cancelled: 0,
      averageLatencyMs: 320,
      totalTokens: 120,
    },
  ],
  failures: [{ errorCode: 'MODEL_PROVIDER_RATE_LIMITED', count: 1 }],
  recent: [],
  recentFailures: [
    {
      id: 'invoke-1',
      operation: 'practice_evaluation',
      provider: 'deepseek',
      model: 'deepseek-chat',
      status: 'failed',
      latencyMs: 600,
      totalTokens: 20,
      errorCode: 'MODEL_PROVIDER_RATE_LIMITED',
      createdAt: '2026-07-17T00:00:00.000Z',
    },
  ],
  trend: [
    { date: '2026-07-17', invocations: 6, succeeded: 5, failed: 1, cancelled: 0, totalTokens: 120 },
  ],
};

describe('PlatformAiAnalyticsContent', () => {
  it('keeps provider metrics, scenarios, and safe failure codes distinct from Agent runtime cards', () => {
    const markup = renderToStaticMarkup(createElement(PlatformAiAnalyticsContent, { analytics }));

    expect(markup).toContain('提供商与模型');
    expect(markup).toContain('业务调用场景');
    expect(markup).toContain('MODEL_PROVIDER_RATE_LIMITED');
    expect(markup).not.toContain('prompt');
  });

  it('renders an explicit empty state when the selected model filter has no traffic', () => {
    const markup = renderToStaticMarkup(
      createElement(PlatformAiAnalyticsContent, {
        analytics: { ...analytics, totals: { ...analytics.totals, invocations: 0 } },
      }),
    );

    expect(markup).toContain('当前筛选下没有真实模型调用');
  });
});
