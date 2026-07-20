import { describe, expect, it } from 'vitest';
import { aiUsageSummaryPath } from './ai-usage-api';

describe('AI usage summary request path', () => {
  it('uses the private summary endpoint with the chosen range', () => {
    expect(aiUsageSummaryPath('30d')).toBe('/ai-usage/summary?period=30d');
  });
});
