import type { PlatformAiAnalytics } from '@interview-agent/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PlatformAiAnalyticsContent } from './PlatformAiAnalytics';
import { operationLabel, OPERATION_OPTIONS } from './platform-ai-operations';

const analytics = {
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
  guardrails: {
    budgetRejected: 2,
    circuitRejected: 1,
    openCircuits: 1,
    halfOpenCircuits: 0,
  },
  quality: {
    deadLetterJobs: 1,
    embeddingCoverage: 80,
    retrievalLatencyMs: 120,
    schemaPassRate: 90,
    fallbackRate: 10,
    budgetRejected: 2,
  },
} as PlatformAiAnalytics & {
  guardrails: {
    budgetRejected: number;
    circuitRejected: number;
    openCircuits: number;
    halfOpenCircuits: number;
  };
};

describe('PlatformAiAnalyticsContent', () => {
  it('offers every guarded AI operation with a distinct business label', () => {
    expect(OPERATION_OPTIONS.map((option) => option.value)).toEqual([
      'all',
      'model_connection_test',
      'embedding',
      'practice_evaluation',
      'practice_report',
      'interview_next',
      'admin_page_agent',
      'user_page_agent',
    ]);
    expect(operationLabel('embedding')).toBe('向量检索');
    expect(operationLabel('practice_report')).toBe('训练报告');
    expect(operationLabel('user_page_agent')).toBe('用户端 Agent');
  });

  it('keeps provider metrics, scenarios, and safe failure codes distinct from Agent runtime cards', () => {
    const markup = renderToStaticMarkup(createElement(PlatformAiAnalyticsContent, { analytics }));

    expect(markup).toContain('提供商与模型');
    expect(markup).toContain('业务调用场景');
    expect(markup).toContain('MODEL_PROVIDER_RATE_LIMITED');
    expect(markup).toContain('预算拒绝');
    expect(markup).toContain('熔断拒绝');
    expect(markup).toContain('Embedding 覆盖率');
    expect(markup).toContain('检索延迟');
    expect(markup).toContain('死信任务');
    expect(markup).toContain('Fallback 率');
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
