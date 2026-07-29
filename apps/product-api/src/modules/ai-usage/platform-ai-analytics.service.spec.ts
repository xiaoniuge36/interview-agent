import type { ProductRequestContext } from '../../common/context/request-context';
import { PlatformAiAnalyticsService } from './platform-ai-analytics.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'system',
  actor: {
    id: 'platform-admin',
    subject: 'platform-admin',
    tenantId: 'system',
    role: 'platform_admin',
    scopes: ['analytics:read'],
  },
};

describe('PlatformAiAnalyticsService', () => {
  it('aggregates the filtered global AI health view after platform authorization', async () => {
    const { service, policy, store } = createService();

    const result = await service.analytics(context, {
      period: '7d',
      provider: 'deepseek',
      operation: 'practice_evaluation',
    });

    expect(result).toMatchObject({
      filters: { provider: 'deepseek', operation: 'practice_evaluation' },
      totals: { invocations: 1, successRate: 100 },
      failures: [],
      guardrails: {
        budgetRejected: 0,
        circuitRejected: 0,
        openCircuits: 0,
        halfOpenCircuits: 0,
      },
      quality: {
        deadLetterJobs: 1,
        embeddingCoverage: 80,
        retrievalLatencyMs: 120,
        schemaPassRate: 90,
        fallbackRate: 10,
        budgetRejected: 0,
      },
    });
    expect(policy.assert).toHaveBeenCalledWith(context.actor, 'analytics:read', { platform: true });
    expect(store.groupBy.mock.calls[0][0].where).toEqual(
      expect.objectContaining({ provider: 'deepseek', operation: 'practice_evaluation' }),
    );
  });

  it('does not query global usage when the platform check fails', async () => {
    const { service, store } = createService({
      assert: jest.fn(() => {
        throw new Error('forbidden');
      }),
    });

    await expect(service.analytics(context, { period: 'today' })).rejects.toThrow('forbidden');

    expect(store.aggregate).not.toHaveBeenCalled();
  });
});

function createService(policyOverride: { assert?: jest.Mock } = {}) {
  const store = {
    aggregate: jest
      .fn()
      .mockResolvedValue({ _avg: { latencyMs: 100 }, _sum: { totalTokens: null } }),
    groupBy: jest
      .fn()
      .mockResolvedValueOnce([
        { status: 'succeeded', _count: { _all: 1 }, _sum: { totalTokens: null } },
      ])
      .mockResolvedValueOnce([
        {
          provider: 'deepseek',
          model: 'deepseek-chat',
          status: 'succeeded',
          _count: { _all: 1 },
          _sum: { totalTokens: null },
        },
      ])
      .mockResolvedValueOnce([
        {
          operation: 'practice_evaluation',
          status: 'succeeded',
          _count: { _all: 1 },
          _sum: { totalTokens: null },
        },
      ])
      .mockResolvedValueOnce([
        {
          operation: 'practice_evaluation',
          _count: { _all: 1 },
          _sum: { totalTokens: null },
          _avg: { latencyMs: 100 },
        },
      ])
      .mockResolvedValueOnce([]),
    findMany: jest.fn().mockResolvedValue([]),
  };
  const prisma = {
    aiInvocation: store,
    backgroundJob: { count: jest.fn().mockResolvedValue(1) },
    retrievalChunk: {
      count: jest.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(8),
    },
    retrievalLog: { aggregate: jest.fn().mockResolvedValue({ _avg: { latencyMs: 120 } }) },
    agentRun: {
      count: jest
        .fn()
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(9)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(1),
    },
  };
  const policy = { assert: policyOverride.assert ?? jest.fn() };
  const circuits = { summary: jest.fn(() => ({ openCircuits: 0, halfOpenCircuits: 0 })) };
  return {
    service: new PlatformAiAnalyticsService(prisma as never, policy as never, circuits as never),
    store,
    policy,
  };
}
