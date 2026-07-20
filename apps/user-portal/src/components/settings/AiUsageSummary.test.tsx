import type { AiUsageSummary as AiUsageSummaryData } from '@interview-agent/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AiUsageSummaryContent } from './AiUsageSummary';

const summary: AiUsageSummaryData = {
  period: '7d',
  range: { startAt: '2026-07-10T00:00:00.000Z', endAt: '2026-07-17T00:00:00.000Z' },
  totals: {
    invocations: 2,
    succeeded: 1,
    failed: 1,
    cancelled: 0,
    successRate: 50,
    averageLatencyMs: 420,
    totalTokens: null,
    usageAvailable: false,
  },
  byModel: [
    {
      provider: 'deepseek',
      model: 'deepseek-chat',
      invocations: 2,
      succeeded: 1,
      failed: 1,
      cancelled: 0,
      totalTokens: null,
    },
  ],
  recent: [
    {
      id: 'invoke-1',
      operation: 'practice_evaluation',
      provider: 'deepseek',
      model: 'deepseek-chat',
      status: 'failed',
      latencyMs: 420,
      totalTokens: null,
      errorCode: 'MODEL_PROVIDER_RATE_LIMITED',
      createdAt: '2026-07-17T00:00:00.000Z',
    },
  ],
};

describe('AiUsageSummaryContent', () => {
  it('explains missing token usage and renders a safe recent error state', () => {
    const markup = renderToStaticMarkup(createElement(AiUsageSummaryContent, { summary }));

    expect(markup).toContain('供应商尚未返回 token 用量');
    expect(markup).toContain('单题评价');
    expect(markup).toContain('失败');
    expect(markup).not.toContain('prompt');
  });

  it('shows an action-oriented empty state when no invocation exists', () => {
    const markup = renderToStaticMarkup(
      createElement(AiUsageSummaryContent, {
        summary: {
          ...summary,
          totals: { ...summary.totals, invocations: 0 },
          byModel: [],
          recent: [],
        },
      }),
    );

    expect(markup).toContain('还没有 AI 调用记录');
  });
});
