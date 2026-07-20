import { UserPageAgentService } from './user-page-agent.service';

const context = {
  requestId: 'request-1',
  traceId: 'trace-12345678',
  tenantId: 'tenant-1',
  actor: { id: 'user-1', role: 'user' as const },
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
  messages: [{ role: 'user', content: '根据我的薄弱项推荐训练' }],
  tools: [{ type: 'function', function: { name: 'done', parameters: {} } }],
  tool_choice: 'required',
};

describe('UserPageAgentService', () => {
  it('uses the user default credential and records the user operation', async () => {
    const { service, provider, invocations } = createService(credential);

    const result = await service.completion(context, request);

    expect(invocations.measure).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'user_page_agent',
        credentialId: credential.id,
        userId: context.actor.id,
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

  it('returns a clear setup state when no model connection exists', async () => {
    const credentials = { resolveDefault: jest.fn().mockResolvedValue(null) };
    const service = new UserPageAgentService(credentials as never, {} as never, {} as never);

    await expect(service.config(context)).resolves.toEqual({
      enabled: false,
      model: null,
      provider: null,
      message: '请先连接一个 AI 模型，刷题教练才能开始工作。',
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
    service: new UserPageAgentService(
      credentials as never,
      provider as never,
      invocations as never,
    ),
    provider,
    invocations,
  };
}
