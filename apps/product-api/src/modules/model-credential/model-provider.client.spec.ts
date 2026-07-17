import { ModelProviderClient } from './model-provider.client';

const input = {
  provider: 'openai' as const,
  model: 'gpt-test',
  baseUrl: null,
  apiKey: 'test-key',
  systemPrompt: 'system',
  userPrompt: 'user',
};

describe('ModelProviderClient streaming', () => {
  const fetchImplementation = global.fetch;

  afterEach(() => {
    global.fetch = fetchImplementation;
  });

  it('normalizes OpenAI compatible SSE deltas without forwarding other fields', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        sseResponse([
          'data: {"choices":[{"delta":{"reasoning_content":"hidden","content":"你"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"好"}}]}\n\n',
          'data: [DONE]\n\n',
        ]),
      );

    const values = await collect(new ModelProviderClient().stream(input));

    expect(values).toEqual(['你', '好']);
    expect(JSON.parse(String((global.fetch as jest.Mock).mock.calls[0][1].body))).toMatchObject({
      stream: true,
    });
  });

  it('normalizes Anthropic text delta events', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        sseResponse(['data: {"type":"content_block_delta","delta":{"text":"评价"}}\n\n']),
      );

    const values = await collect(
      new ModelProviderClient().stream({ ...input, provider: 'anthropic' }),
    );

    expect(values).toEqual(['评价']);
  });

  it('rejects malformed provider SSE payloads without exposing the raw payload', async () => {
    global.fetch = jest.fn().mockResolvedValue(sseResponse(['data: {not-json}\n\n']));

    await expect(collect(new ModelProviderClient().stream(input))).rejects.toEqual(
      expect.objectContaining({ code: 'MODEL_PROVIDER_RESPONSE_INVALID' }),
    );
  });
});

async function collect(stream: AsyncIterable<string>) {
  const values: string[] = [];
  for await (const value of stream) values.push(value);
  return values;
}

function sseResponse(parts: string[]) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const part of parts) controller.enqueue(encoder.encode(part));
        controller.close();
      },
    }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  );
}
