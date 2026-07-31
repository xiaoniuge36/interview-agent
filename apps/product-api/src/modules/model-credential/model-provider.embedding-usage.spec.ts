import { ModelProviderClient } from './model-provider.client';

const EMBEDDING_DIMENSIONS = 1536;

describe('ModelProviderClient embedding usage', () => {
  it('reports embedding usage with zero output tokens despite provider completion tokens', async () => {
    const onUsage = jest.fn();
    const client = providerClient({
      data: [{ index: 0, embedding: embeddingVector() }],
      usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 7 },
    });

    await expect(client.embed({ ...connection(), onUsage }, ['prompt'])).resolves.toEqual([
      embeddingVector(),
    ]);

    expect(onUsage).toHaveBeenCalledTimes(1);
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 7, outputTokens: 0, totalTokens: 7 });
  });

  it('does not invent embedding usage when the provider omits it', async () => {
    const onUsage = jest.fn();
    const client = providerClient({ data: [{ index: 0, embedding: embeddingVector() }] });

    await expect(client.embed({ ...connection(), onUsage }, ['prompt'])).resolves.toEqual([
      embeddingVector(),
    ]);

    expect(onUsage).not.toHaveBeenCalled();
  });

  it('does not report usage from an embedding response that fails validation', async () => {
    const onUsage = jest.fn();
    const client = providerClient({
      data: [{ index: 0, embedding: [0.1] }],
      usage: { prompt_tokens: 7, total_tokens: 7 },
    });

    await expect(client.embed({ ...connection(), onUsage }, ['prompt'])).rejects.toEqual(
      expect.objectContaining({ code: 'EMBEDDING_DIMENSION_INVALID' }),
    );

    expect(onUsage).not.toHaveBeenCalled();
  });
});

function providerClient(payload: Record<string, unknown>) {
  return new ModelProviderClient({ fetch: jest.fn().mockResolvedValue(Response.json(payload)) });
}

function connection() {
  return {
    provider: 'openai' as const,
    model: 'text-embedding-3-small',
    baseUrl: null,
    apiKey: 'key',
  };
}

function embeddingVector() {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.1);
}
