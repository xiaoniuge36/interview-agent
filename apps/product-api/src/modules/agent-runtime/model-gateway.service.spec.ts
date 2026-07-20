import { ModelGatewayService } from './model-gateway.service';

const CREDENTIAL = {
  provider: 'deepseek' as const,
  model: 'deepseek-chat',
  baseUrl: null,
  apiKey: 'sk-secret',
  id: 'credential-1',
};

function createService() {
  const resolver = { resolveForInvocation: jest.fn().mockResolvedValue(CREDENTIAL) };
  const provider = { complete: jest.fn().mockResolvedValue('{"ok":true}') };
  const invocations = { measure: jest.fn((_metadata, run) => run(jest.fn())) };
  return {
    service: new ModelGatewayService(resolver as never, provider as never, invocations as never),
    resolver,
    provider,
  };
}

describe('ModelGatewayService', () => {
  it('uses the scoped credential without exposing its API key in the response', async () => {
    const { service, provider, resolver } = createService();
    const grant = {
      grantId: '00000000-0000-4000-8000-000000000001',
      tenantId: 'tenant-1',
      userId: 'user-1',
      credentialId: 'credential-1',
      sessionId: 'interview-1',
      commandId: 'command-1',
      operation: 'interview_next' as const,
      traceId: 'trace-0001',
      expiresAt: '2026-07-17T08:00:30.000Z',
    };

    const result = await service.invoke(grant, {
      grant: 'signed-runtime-grant.payload-signature',
      systemPrompt: 'system',
      userPrompt: 'user',
      outputSchemaVersion: 'interview-runtime.v1',
      traceId: 'trace-0001',
    });

    expect(resolver.resolveForInvocation).toHaveBeenCalledWith(grant);
    expect(provider.complete).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'sk-secret', systemPrompt: 'system' }),
    );
    expect(result).toEqual({ content: '{"ok":true}' });
    expect(result).not.toHaveProperty('apiKey');
  });
});
