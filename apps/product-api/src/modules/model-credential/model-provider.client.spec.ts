import { ModelProviderClient } from './model-provider.client';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ModelProviderClient', () => {
  it('calls OpenAI-compatible providers server-side with the supplied secret', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"stage":"warmup","content":"请介绍一个项目。","shouldFinish":false}' } }],
        }),
      ),
    );
    const client = new ModelProviderClient();

    const output = await client.complete({
      provider: 'deepseek',
      model: 'deepseek-chat',
      baseUrl: null,
      apiKey: 'sk-server-only',
      systemPrompt: '只返回 JSON。',
      userPrompt: '开始面试。',
    });

    expect(output).toContain('请介绍一个项目');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deepseek.com/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer sk-server-only' }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('uses the native Anthropic messages API when selected', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ content: [{ type: 'text', text: '{"stage":"warmup","content":"你好","shouldFinish":false}' }] })),
    );
    const client = new ModelProviderClient();

    await client.testConnection({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      baseUrl: null,
      apiKey: 'sk-ant-server-only',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-api-key': 'sk-ant-server-only' }),
      }),
    );
  });
});
