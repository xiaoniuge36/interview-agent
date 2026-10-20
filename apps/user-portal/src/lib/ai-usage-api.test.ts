import { describe, expect, it } from 'vitest';
import { aiUsageInvocationsPath, aiUsageSummaryPath } from './ai-usage-api';

describe('AI usage summary request path', () => {
  it('uses the private summary endpoint with the chosen range', () => {
    expect(aiUsageSummaryPath('30d')).toBe('/ai-usage/summary?period=30d');
  });

  it('encodes the paged invocation query', () => {
    expect(aiUsageInvocationsPath({ period: '7d', page: 3, pageSize: 20 })).toBe(
      '/ai-usage/invocations?period=7d&page=3&pageSize=20',
    );
  });
});
