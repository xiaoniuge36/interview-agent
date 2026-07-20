import { AdminPageAgentService } from './admin-page-agent.service';

const context = {
  requestId: 'request-1',
  traceId: 'trace-12345678',
  tenantId: 'tenant-1',
  actor: {
    id: 'admin-1',
    subject: 'admin-1',
    tenantId: 'tenant-1',
    role: 'admin' as const,
    scopes: ['model_credential:read' as const],
  },
};

const credential = {
  id: 'credential-1',
  provider: 'openai_compatible' as const,
  model: 'glm-test',
  baseUrl: 'https://model.example.test/v1',
  apiKey: 'secret-key',
};

const request = {
  model: 'ignored-by-server',
  messages: [{ role: 'user', content: '查询 token' }],
  tools: [{ type: 'function', function: { name: 'done', parameters: {} } }],
  tool_choice: 'required',
};

describe('AdminPageAgentService', () => {
  it('uses the caller default credential and records the dedicated operation', async () => {
    const { service, provider, invocations } = createService(credential);

    const result = await service.completion(context, request);

    expect(invocations.measure).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'admin_page_agent',
        credentialId: credential.id,
        traceId: context.traceId,
      }),
      expect.any(Function),
    );
    expect(provider.invokeCompatible).toHaveBeenCalledWith(
      expect.objectContaining({
        model: credential.model,
        requestBody: expect.objectContaining({ model: credential.model }),
      }),
      expect.any(Function),
    );
    expect(result).toHaveProperty('choices');
  });

  it('reports a setup message when the admin has no verified default model', async () => {
    const credentials = { resolveDefault: jest.fn().mockResolvedValue(null) };
    const service = new AdminPageAgentService(credentials as never, {} as never, {} as never);

    await expect(service.config(context)).resolves.toEqual({
      enabled: false,
      model: null,
      provider: null,
      message: '请先为当前后台账号配置并测试一个模型连接。',
    });
    await expect(service.completion(context, request)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'MODEL_CONNECTION_REQUIRED' }),
    });
  });
});

function createService(currentCredential: typeof credential | null) {
  const credentials = { resolveDefault: jest.fn().mockResolvedValue(currentCredential) };
  const provider = {
    invokeCompatible: jest.fn().mockResolvedValue({
      choices: [{ message: { role: 'assistant', tool_calls: [] } }],
    }),
  };
  const invocations = { measure: jest.fn(async (_metadata, run) => run(jest.fn())) };
  return {
    service: new AdminPageAgentService(
      credentials as never,
      provider as never,
      invocations as never,
    ),
    provider,
    invocations,
  };
}
