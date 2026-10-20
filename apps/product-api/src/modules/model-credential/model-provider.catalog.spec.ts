import { ModelProviderClient } from './model-provider.client';

const fetchImplementation = global.fetch;
const originalNodeEnv = process.env.NODE_ENV;
const originalE2eModelStubUrl = process.env.E2E_MODEL_STUB_URL;

afterEach(() => {
  global.fetch = fetchImplementation;
  restoreEnvironment('NODE_ENV', originalNodeEnv);
  restoreEnvironment('E2E_MODEL_STUB_URL', originalE2eModelStubUrl);
});

describe('ModelProviderClient model catalog request', () => {
  it('reads the OpenAI-compatible model list with the user key and normalized entries', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      Response.json({
        data: [
          { id: 'deepseek-chat', display_name: 'DeepSeek Chat' },
          { id: 'deepseek-reasoner' },
          { id: 'deepseek-chat' },
          { object: 'model' },
          { id: '   ' },
        ],
      }),
    );

    const models = await new ModelProviderClient().listModels({
      provider: 'deepseek',
      baseUrl: null,
      apiKey: 'test-key',
    });

    expect(models).toEqual([
      { id: 'deepseek-chat', label: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', label: 'deepseek-reasoner' },
    ]);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://api.deepseek.com/v1/models');
    expect((global.fetch as jest.Mock).mock.calls[0][1]).toMatchObject({
      method: 'GET',
      headers: { Authorization: 'Bearer test-key' },
    });
  });

  it('uses Anthropic headers and honors a custom base URL', async () => {
    global.fetch = jest.fn().mockResolvedValue(Response.json({ data: [{ id: 'claude-test' }] }));

    const models = await new ModelProviderClient().listModels({
      provider: 'anthropic',
      baseUrl: 'https://gateway.example.test/v1',
      apiKey: 'test-key',
    });

    expect(models).toEqual([{ id: 'claude-test', label: 'claude-test' }]);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://gateway.example.test/v1/models',
    );
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers).toMatchObject({
      'x-api-key': 'test-key',
      'anthropic-version': '2023-06-01',
    });
  });
});

describe('ModelProviderClient model catalog errors', () => {
  it('maps a rejected key to an auth error and rejects unknown payloads', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 401 }));
    await expect(
      new ModelProviderClient().listModels({
        provider: 'openai',
        baseUrl: null,
        apiKey: 'test-key',
      }),
    ).rejects.toEqual(expect.objectContaining({ code: 'MODEL_PROVIDER_AUTH_FAILED' }));

    global.fetch = jest.fn().mockResolvedValue(Response.json({ models: [] }));
    await expect(
      new ModelProviderClient().listModels({
        provider: 'openai',
        baseUrl: null,
        apiKey: 'test-key',
      }),
    ).rejects.toEqual(expect.objectContaining({ code: 'MODEL_PROVIDER_RESPONSE_INVALID' }));
  });
});

function restoreEnvironment(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
