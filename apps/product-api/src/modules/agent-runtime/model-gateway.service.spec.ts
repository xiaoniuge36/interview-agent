import { ModelGatewayService } from './model-gateway.service';
import { BadGatewayException } from '@nestjs/common';
import { ModelProviderError } from '../model-credential/model-provider.client';

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
  const invocations = {
    measure: jest.fn((_metadata, run) =>
      run(jest.fn(), {
        maxInputCharacters: 16_000,
        maxOutputTokens: 1_200,
        maxAttempts: 2,
        timeoutMs: 30_000,
      }),
    ),
  };
  return {
    service: new ModelGatewayService(resolver as never, provider as never, invocations as never),
    resolver,
    provider,
    invocations,
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
      expect.objectContaining({
        apiKey: 'sk-secret',
        systemPrompt: 'system',
        maxOutputTokens: 1_200,
        timeoutMs: 30_000,
      }),
    );
    expect(result).toEqual({ content: '{"ok":true}' });
    expect(result).not.toHaveProperty('apiKey');
  });

  it('preserves a stable guardrail rejection code', async () => {
    const { service, invocations, provider } = createService();
    invocations.measure.mockRejectedValueOnce(new BadGatewayException({ code: 'AI_CIRCUIT_OPEN' }));

    await expect(
      service.invoke(interviewGrant(), {
        grant: 'signed-runtime-grant.payload-signature',
        systemPrompt: 'system',
        userPrompt: 'user',
        outputSchemaVersion: 'interview-runtime.v1',
        traceId: 'trace-0001',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'AI_CIRCUIT_OPEN' }),
    });
    expect(provider.complete).not.toHaveBeenCalled();
  });
});

describe('ModelGatewayService endpoint guard', () => {
  it('returns an unsafe provider endpoint as a stable non-retryable rejection', async () => {
    const { service, provider } = createService();
    provider.complete.mockRejectedValueOnce(
      new ModelProviderError('MODEL_PROVIDER_ENDPOINT_BLOCKED'),
    );

    await expect(
      service.invoke(interviewGrant(), {
        grant: 'signed-runtime-grant.payload-signature',
        systemPrompt: 'system',
        userPrompt: 'user',
        outputSchemaVersion: 'interview-runtime.v1',
        traceId: 'trace-0001',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'MODEL_PROVIDER_ENDPOINT_BLOCKED' }),
      status: 400,
    });
  });
});

describe('ModelGatewayService grant scope', () => {
  it('rejects a grant whose operation does not match the requested output schema', async () => {
    const { service } = createService();
    const grant = {
      grantId: '00000000-0000-4000-8000-000000000001',
      tenantId: 'tenant-1',
      userId: 'user-1',
      credentialId: 'credential-1',
      sessionId: 'practice-1',
      commandId: 'practice-report:practice-1',
      operation: 'practice_report' as const,
      traceId: 'trace-0001',
      expiresAt: '2026-07-17T08:00:30.000Z',
    };

    await expect(
      service.invoke(grant, {
        grant: 'signed-runtime-grant.payload-signature',
        systemPrompt: 'system',
        userPrompt: 'user',
        outputSchemaVersion: 'interview-runtime.v1',
        traceId: 'trace-0001',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'MODEL_INVOCATION_GRANT_INVALID' }),
    });
  });
});

function interviewGrant() {
  return {
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
}
