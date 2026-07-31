import { AiInvocationService } from '../ai-usage/ai-invocation.service';
import { AiBudgetPolicy } from '../ai-usage/ai-budget-policy';
import { AiCircuitBreaker } from '../ai-usage/ai-circuit-breaker';
import { ModelProviderClient } from '../model-credential/model-provider.client';
import { EmbeddingClient } from './embedding-client';

const EMBEDDING_DIMENSIONS = 1536;

test('uses the actor default credential through the separate embedding endpoint', async () => {
  const resolver = {
    resolveDefaultForInvocation: jest.fn().mockResolvedValue({
      id: 'credential-1',
      provider: 'openai',
      model: 'text-embedding-3-small',
      baseUrl: null,
      apiKey: 'secret',
    }),
  };
  const provider = { embed: jest.fn().mockResolvedValue([[0.1]]) };
  const invocations = { measure: jest.fn((_: unknown, run: () => Promise<unknown>) => run()) };
  const client = new EmbeddingClient(resolver as never, provider as never, invocations as never);

  await expect(
    client.embed({
      tenantId: 'tenant-1',
      userId: 'user-1',
      traceId: 'trace-1',
      text: 'embed this',
    }),
  ).resolves.toEqual([0.1]);

  expect(invocations.measure).toHaveBeenCalledWith(
    expect.objectContaining({ operation: 'embedding', credentialId: 'credential-1' }),
    expect.any(Function),
  );
  expect(provider.embed).toHaveBeenCalledWith(
    expect.objectContaining({ model: 'text-embedding-3-small' }),
    ['embed this'],
  );
});

test('returns no vector when a worker has no verified embedding credential', async () => {
  const resolver = { resolveDefaultForInvocation: jest.fn().mockResolvedValue(null) };
  const provider = { embed: jest.fn() };
  const invocations = { measure: jest.fn() };
  const client = new EmbeddingClient(resolver as never, provider as never, invocations as never);

  await expect(
    client.embed({
      tenantId: 'tenant-1',
      userId: 'user-1',
      traceId: 'trace-1',
      text: 'embed this',
    }),
  ).resolves.toBeNull();

  expect(provider.embed).not.toHaveBeenCalled();
});

test('persists successful provider embedding usage through the invocation chain', async () => {
  const prisma = invocationStore();
  const provider = new ModelProviderClient({
    fetch: jest.fn().mockResolvedValue(
      Response.json({
        data: [{ index: 0, embedding: embeddingVector() }],
        usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 7 },
      }),
    ),
  });
  const client = new EmbeddingClient(
    credentialResolver() as never,
    provider,
    new AiInvocationService(prisma as never, new AiBudgetPolicy(), new AiCircuitBreaker()),
  );

  await expect(
    client.embed({
      tenantId: 'tenant-1',
      userId: 'user-1',
      traceId: 'trace-1',
      text: 'embed this',
    }),
  ).resolves.toEqual(embeddingVector());

  expect(prisma.aiInvocation.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        credentialId: 'credential-1',
        traceId: 'trace-1',
        operation: 'embedding',
        status: 'succeeded',
        inputTokens: 7,
        outputTokens: 0,
        totalTokens: 7,
      }),
    }),
  );
});

function credentialResolver() {
  return {
    resolveDefaultForInvocation: jest.fn().mockResolvedValue({
      id: 'credential-1',
      provider: 'openai',
      model: 'text-embedding-3-small',
      baseUrl: null,
      apiKey: 'secret',
    }),
  };
}

function invocationStore() {
  return {
    aiInvocation: {
      create: jest.fn().mockResolvedValue({ id: 'invocation-1' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

function embeddingVector() {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.1);
}
