import 'reflect-metadata';
import { AiInvocationService } from './ai-invocation.service';
import { PrismaService } from '../../common/database/prisma.service';
import { AiBudgetPolicy } from './ai-budget-policy';
import { AiCircuitBreaker } from './ai-circuit-breaker';

const metadata = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  credentialId: 'credential-1',
  operation: 'practice_evaluation' as const,
  provider: 'deepseek' as const,
  model: 'deepseek-chat',
  traceId: 'trace-0001',
  practiceSessionId: 'practice-1',
  practiceItemId: 'item-1',
};

describe('AiInvocationService runtime metadata', () => {
  it('retains PrismaService runtime metadata for Nest dependency injection', () => {
    expect(Reflect.getMetadata('design:paramtypes', AiInvocationService)).toEqual([
      PrismaService,
      AiBudgetPolicy,
      AiCircuitBreaker,
    ]);
  });
});

describe('AiInvocationService persistence', () => {
  it('records provider usage after a successful invocation without storing request content', async () => {
    const { service, prisma } = createService();

    const result = await service.measure(metadata, async (onUsage) => {
      onUsage({ inputTokens: 12, outputTokens: 8, totalTokens: 20 });
      return 'evaluation';
    });

    expect(result).toBe('evaluation');
    expect(prisma.aiInvocation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'succeeded',
          inputTokens: 12,
          outputTokens: 8,
          totalTokens: 20,
          errorCode: null,
        }),
      }),
    );
    expect(JSON.stringify(prisma.aiInvocation.create.mock.calls)).not.toContain('prompt');
  });

  it('does not fail the model operation when invocation persistence is unavailable', async () => {
    const { service } = createService({
      create: jest.fn().mockRejectedValue(new Error('database down')),
    });

    await expect(service.measure(metadata, async () => 'evaluation')).resolves.toBe('evaluation');
  });

  it('records an abort as cancelled and rethrows the original error', async () => {
    const { service, prisma } = createService();
    const aborted = Object.assign(new Error('aborted'), { name: 'AbortError' });

    await expect(service.measure(metadata, async () => Promise.reject(aborted))).rejects.toBe(
      aborted,
    );

    expect(prisma.aiInvocation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'cancelled', errorCode: null }),
      }),
    );
  });

  it('cleans expired records at most once per process day without blocking an invocation', async () => {
    const { service, prisma } = createService();

    await service.measure(metadata, async () => 'first');
    await service.measure(metadata, async () => 'second');

    expect(prisma.aiInvocation.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.aiInvocation.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdAt: { lt: expect.any(Date) } } }),
    );
  });
});

describe('AiInvocationService guardrails', () => {
  it('rejects an exhausted operation budget before calling the provider', async () => {
    const { service, prisma } = createService();
    const provider = jest.fn().mockResolvedValue('should-not-run');

    await expect(
      service.measure({ ...metadata, inputCharacters: 99_999 }, provider),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'AI_BUDGET_EXHAUSTED' }),
    });

    expect(provider).not.toHaveBeenCalled();
    expect(prisma.aiInvocation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed', errorCode: 'AI_BUDGET_EXHAUSTED' }),
      }),
    );
  });

  it('releases a half-open probe after an abort that is not a circuit failure', async () => {
    const circuits = new AiCircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 1,
      maxHalfOpenProbes: 1,
    });
    const key = 'deepseek:deepseek-chat:practice_evaluation';
    circuits.recordFailure(key, 0);
    const { service } = createService({}, circuits);
    const aborted = Object.assign(new Error('aborted'), { name: 'AbortError' });

    await expect(service.measure(metadata, async () => Promise.reject(aborted))).rejects.toBe(
      aborted,
    );

    expect(circuits.state(key)).toBe('closed');
  });
});

describe('AiInvocationService circuit outcomes', () => {
  it('opens the embedding circuit after a retryable timeout', async () => {
    const circuits = new AiCircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 1,
      maxHalfOpenProbes: 1,
    });
    const { service } = createService({}, circuits);
    const timeout = Object.assign(new Error('timeout'), { code: 'EMBEDDING_TIMEOUT' });

    await expect(
      service.measure({ ...metadata, operation: 'embedding' }, async () => Promise.reject(timeout)),
    ).rejects.toBe(timeout);

    expect(circuits.state('deepseek:deepseek-chat:embedding')).toBe('open');
  });
});

function createService(overrides: { create?: jest.Mock } = {}, circuits = new AiCircuitBreaker()) {
  const prisma = {
    aiInvocation: {
      create: overrides.create ?? jest.fn().mockResolvedValue({ id: 'invoke-1' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
  };
  return {
    service: new AiInvocationService(prisma as never, new AiBudgetPolicy(), circuits),
    prisma,
  };
}
