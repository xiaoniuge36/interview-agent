import type { ProductRequestContext } from '../../common/context/request-context';
import { AiUsageService } from './ai-usage.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'user-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['model_credential:read'],
  },
};

describe('AiUsageService', () => {
  it('limits summary aggregates and recent activity to the current tenant and user', async () => {
    const { service, store, policy } = createService();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-17T12:00:00.000Z'));
    try {
      const result = await service.summary(context, { period: '7d' });

      expect(result).toMatchObject({
        period: '7d',
        totals: { invocations: 4, succeeded: 3, failed: 1, totalTokens: 42 },
        byModel: [{ provider: 'deepseek', model: 'deepseek-chat', invocations: 4 }],
      });
    } finally {
      jest.useRealTimers();
    }
    expect(policy.assert).toHaveBeenCalledWith(context.actor, 'model_credential:read', {
      tenantId: 'tenant-1',
      ownerId: 'user-1',
    });
    expect(store.groupBy.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
      }),
    );
  });

  it('checks access before querying private AI usage data', async () => {
    const { service, store } = createService({
      assert: jest.fn(() => {
        throw new Error('forbidden');
      }),
    });

    await expect(service.summary(context, { period: 'today' })).rejects.toThrow('forbidden');

    expect(store.groupBy).not.toHaveBeenCalled();
  });
});

function createService(policyOverride: { assert?: jest.Mock } = {}) {
  const store = usageStore();
  const prisma = { aiInvocation: store };
  const policy = { assert: policyOverride.assert ?? jest.fn() };
  return { service: new AiUsageService(prisma as never, policy as never), store, policy };
}

function usageStore() {
  const groupBy = jest.fn();
  for (const response of groupByResponses()) groupBy.mockResolvedValueOnce(response);
  const record = usageRecord();
  return {
    aggregate: jest.fn().mockResolvedValue({ _avg: { latencyMs: 320 }, _sum: { totalTokens: 42 } }),
    groupBy,
    findMany: jest
      .fn()
      .mockResolvedValueOnce([record])
      .mockResolvedValueOnce([record])
      .mockResolvedValueOnce([record]),
  };
}

function groupByResponses() {
  return [
    statusGroups(),
    modelGroups(),
    operationGroups(),
    [
      {
        operation: 'practice_evaluation',
        _count: { _all: 4 },
        _sum: { totalTokens: 42 },
        _avg: { latencyMs: 320 },
      },
    ],
    [{ errorCode: 'MODEL_PROVIDER_RATE_LIMITED', _count: { _all: 1 } }],
  ];
}

function statusGroups() {
  return [
    { status: 'succeeded', _count: { _all: 3 }, _sum: { totalTokens: 30 } },
    { status: 'failed', _count: { _all: 1 }, _sum: { totalTokens: 12 } },
  ];
}

function modelGroups() {
  return [
    {
      provider: 'deepseek',
      model: 'deepseek-chat',
      status: 'succeeded',
      _count: { _all: 3 },
      _sum: { totalTokens: 30 },
    },
    {
      provider: 'deepseek',
      model: 'deepseek-chat',
      status: 'failed',
      _count: { _all: 1 },
      _sum: { totalTokens: 12 },
    },
  ];
}

function operationGroups() {
  return [
    {
      operation: 'practice_evaluation',
      status: 'succeeded',
      _count: { _all: 3 },
      _sum: { totalTokens: 30 },
    },
    {
      operation: 'practice_evaluation',
      status: 'failed',
      _count: { _all: 1 },
      _sum: { totalTokens: 12 },
    },
  ];
}

function usageRecord() {
  return {
    id: 'invoke-1',
    operation: 'practice_evaluation',
    provider: 'deepseek',
    model: 'deepseek-chat',
    status: 'failed',
    latencyMs: 400,
    totalTokens: 12,
    errorCode: 'MODEL_PROVIDER_RATE_LIMITED',
    createdAt: new Date('2026-07-17T10:00:00.000Z'),
  };
}
