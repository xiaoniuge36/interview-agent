import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AiUsageSummaryQuerySchema,
  AiUsageSummarySchema,
  PlatformAiAnalyticsQuerySchema,
  PlatformAiAnalyticsSchema,
} from './ai-usage';

const summary = {
  period: '7d',
  range: { startAt: '2026-07-10T00:00:00.000Z', endAt: '2026-07-17T00:00:00.000Z' },
  totals: {
    invocations: 12,
    succeeded: 10,
    failed: 2,
    cancelled: 0,
    successRate: 83.33,
    averageLatencyMs: 432,
    totalTokens: null,
    usageAvailable: false,
  },
  byModel: [
    {
      provider: 'deepseek',
      model: 'deepseek-chat',
      invocations: 12,
      succeeded: 10,
      failed: 2,
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
      latencyMs: 800,
      totalTokens: null,
      errorCode: 'MODEL_PROVIDER_RATE_LIMITED',
      createdAt: '2026-07-17T00:00:00.000Z',
    },
  ],
};

test('AI usage query defaults to seven days and rejects unsupported ranges', () => {
  assert.deepEqual(AiUsageSummaryQuerySchema.parse({}), { period: '7d' });
  assert.equal(AiUsageSummaryQuerySchema.safeParse({ period: '90d' }).success, false);
});

test('AI usage summary allows unavailable token usage without exposing prompt content', () => {
  const parsed = AiUsageSummarySchema.parse(summary);
  assert.equal(parsed.totals.usageAvailable, false);
  assert.equal(parsed.recent[0]!.errorCode, 'MODEL_PROVIDER_RATE_LIMITED');
  assert.equal('prompt' in parsed.recent[0]!, false);
  assert.equal('completion' in parsed.recent[0]!, false);
});

test('platform AI analytics validates filters and safe aggregate records', () => {
  assert.deepEqual(
    PlatformAiAnalyticsQuerySchema.parse({ provider: ' deepseek ', operation: 'interview_next' }),
    { period: '7d', provider: 'deepseek', operation: 'interview_next' },
  );
  assert.equal(
    PlatformAiAnalyticsQuerySchema.safeParse({ operation: 'unknown_operation' }).success,
    false,
  );
  assert.deepEqual(
    PlatformAiAnalyticsSchema.parse({
      ...summary,
      filters: { provider: null, operation: null },
      byOperation: [
        {
          operation: 'practice_evaluation',
          invocations: 12,
          succeeded: 10,
          failed: 2,
          cancelled: 0,
          averageLatencyMs: 432,
          totalTokens: null,
        },
      ],
      failures: [
        {
          errorCode: 'MODEL_PROVIDER_RATE_LIMITED',
          count: 2,
        },
      ],
      recentFailures: summary.recent,
      trend: [
        {
          date: '2026-07-17',
          invocations: 12,
          succeeded: 10,
          failed: 2,
          cancelled: 0,
          totalTokens: null,
        },
      ],
    }).recentFailures,
    summary.recent,
  );
});
