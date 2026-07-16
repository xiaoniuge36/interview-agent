import { describe, expect, it } from 'vitest';
import { createPlatformDashboardRequest } from './platform-api';

describe('platform dashboard requests', () => {
  it('uses the integrated platform endpoint and shared response schema', () => {
    const request = createPlatformDashboardRequest('30d');

    expect(request.path).toBe('/admin/platform/dashboard?period=30d');
    expect(
      request.schema.parse({
        period: '30d',
        range: { startAt: '2026-07-01T00:00:00.000Z', endAt: '2026-07-16T00:00:00.000Z' },
        accounts: { total: 0, created: 0, active: 0, disabled: 0, tenants: 0, admin: 0, users: 0 },
        content: { imports: 0, pendingCandidates: 0, publishedQuestions: 0, failedImports: 0 },
        training: { interviews: 0, reports: 0, practiceSubmissions: 0, practiceReports: 0 },
        runtime: {
          runs: 0,
          successRate: 0,
          schemaPassRate: 0,
          averageLatencyMs: 0,
          fallbacks: 0,
          recentFailures: [],
        },
      }).period,
    ).toBe('30d');
  });
});
