import { ModelProviderClient } from './model-provider.client';

const input = {
  provider: 'openai' as const,
  model: 'gpt-test',
  baseUrl: null,
  apiKey: 'test-key',
  systemPrompt: 'system',
  userPrompt: 'user',
};

const fetchImplementation = global.fetch;
const originalNodeEnv = process.env.NODE_ENV;
const originalE2eModelStubUrl = process.env.E2E_MODEL_STUB_URL;

afterEach(() => {
  global.fetch = fetchImplementation;
  restoreEnvironment('NODE_ENV', originalNodeEnv);
  restoreEnvironment('E2E_MODEL_STUB_URL', originalE2eModelStubUrl);
});

describe('ModelProviderClient streaming text', () => {
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
});

describe('ModelProviderClient streaming usage', () => {
  it('forwards normalized OpenAI-compatible token usage without exposing raw SSE data', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        sseResponse([
          'data: {"choices":[{"delta":{"content":"complete"}}]}\n\n',
          'data: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":8,"total_tokens":20,"prompt_tokens_details":{"cached_tokens":3},"completion_tokens_details":{"reasoning_tokens":2}}}\n\n',
          'data: [DONE]\n\n',
        ]),
      );
    const onUsage = jest.fn();

    await collect(new ModelProviderClient().stream({ ...input, onUsage }));

    expect(onUsage).toHaveBeenLastCalledWith({
      inputTokens: 12,
      outputTokens: 8,
      cacheReadTokens: 3,
      reasoningTokens: 2,
      totalTokens: 20,
    });
    expect(JSON.stringify(onUsage.mock.calls)).not.toContain('choices');
  });

  it('merges Anthropic input and final output usage across stream events', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        sseResponse([
          'data: {"type":"message_start","message":{"usage":{"input_tokens":15,"cache_read_input_tokens":4}}}\n\n',
          'data: {"type":"content_block_delta","delta":{"text":"assessment"}}\n\n',
          'data: {"type":"message_delta","usage":{"output_tokens":9}}\n\n',
        ]),
      );
    const onUsage = jest.fn();

    await collect(new ModelProviderClient().stream({ ...input, provider: 'anthropic', onUsage }));

    expect(onUsage).toHaveBeenLastCalledWith({
      inputTokens: 15,
      outputTokens: 9,
      cacheReadTokens: 4,
      totalTokens: 24,
    });
  });
});

describe('ModelProviderClient streaming errors', () => {
  it('rejects malformed provider SSE payloads without exposing the raw payload', async () => {
    global.fetch = jest.fn().mockResolvedValue(sseResponse(['data: {not-json}\n\n']));

    await expect(collect(new ModelProviderClient().stream(input))).rejects.toEqual(
      expect.objectContaining({ code: 'MODEL_PROVIDER_RESPONSE_INVALID' }),
    );
  });
});

describe('ModelProviderClient compatible invocations', () => {
  it('uses the explicit local stub only in the test environment', async () => {
    process.env.NODE_ENV = 'test';
    process.env.E2E_MODEL_STUB_URL = 'http://127.0.0.1:4100/v1';
    global.fetch = jest.fn().mockResolvedValue(compatibleResponse());

    await new ModelProviderClient().invokeCompatible(compatibleInput());

    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'http://127.0.0.1:4100/v1/chat/completions',
    );
  });

  it('never redirects a production provider invocation to the local stub', async () => {
    process.env.NODE_ENV = 'production';
    process.env.E2E_MODEL_STUB_URL = 'http://127.0.0.1:4100/v1';
    global.fetch = jest.fn().mockResolvedValue(compatibleResponse());

    await new ModelProviderClient().invokeCompatible(compatibleInput());

    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://model.example.test/v1/chat/completions',
    );
  });

  it('forwards Page Agent tool calls and normalizes response usage', async () => {
    global.fetch = jest.fn().mockResolvedValue(compatibleResponse());
    const onUsage = jest.fn();
    const result = await new ModelProviderClient().invokeCompatible(compatibleInput(), onUsage);

    expect(result).toMatchObject({ choices: expect.any(Array) });
    expect(onUsage).toHaveBeenCalledWith({
      inputTokens: 24,
      outputTokens: 11,
      cacheReadTokens: 3,
      reasoningTokens: 2,
      totalTokens: 35,
    });
    expect(JSON.parse(String((global.fetch as jest.Mock).mock.calls[0][1].body))).toEqual(compatibleInput().requestBody);
  });

  it('rejects malformed compatible responses', async () => {
    global.fetch = jest.fn().mockResolvedValue(Response.json({ result: 'not-a-completion' }));

    await expect(
      new ModelProviderClient().invokeCompatible({
        provider: 'openai',
        model: 'gpt-test',
        baseUrl: null,
        apiKey: 'test-key',
        requestBody: { model: 'gpt-test', messages: [], tools: [] },
      }),
    ).rejects.toEqual(expect.objectContaining({ code: 'MODEL_PROVIDER_RESPONSE_INVALID' }));
  });
});

function compatibleInput() {
  return {
    provider: 'openai_compatible' as const,
    model: 'glm-test',
    baseUrl: 'https://model.example.test/v1',
    apiKey: 'test-key',
    requestBody: { model: 'glm-test', messages: [], tools: [] },
  };
}

function compatibleResponse() {
  return Response.json({
    choices: [{ message: { role: 'assistant', tool_calls: [] }, finish_reason: 'stop' }],
    usage: {
      prompt_tokens: 24,
      completion_tokens: 11,
      total_tokens: 35,
      prompt_tokens_details: { cached_tokens: 3 },
      completion_tokens_details: { reasoning_tokens: 2 },
    },
  });
}

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

function restoreEnvironment(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
