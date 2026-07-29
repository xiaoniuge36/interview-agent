import { EmbeddingClient } from './embedding-client';

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
