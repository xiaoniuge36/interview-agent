import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../common/config/environment';
import { ModelGatewayController } from './model-gateway.controller';

const REQUEST = {
  grant: 'signed-runtime-grant.payload-signature',
  systemPrompt: 'system',
  userPrompt: 'user',
  outputSchemaVersion: 'interview-runtime.v1',
  traceId: 'trace-test-0001',
};

function createController() {
  const models = { invoke: jest.fn().mockResolvedValue({ content: '{"ok":true}' }) };
  const grants = {
    verify: jest.fn().mockReturnValue({
      tenantId: 'tenant-1',
      userId: 'user-1',
      credentialId: 'credential-1',
      sessionId: 'session-1',
      commandId: 'command-1',
      traceId: 'trace-test-0001',
      operation: 'interview_next',
    }),
  };
  const config = {
    get: jest.fn().mockReturnValue('test-internal-token-with-at-least-32-characters'),
  };
  return {
    controller: new ModelGatewayController(
      config as unknown as ConfigService<Environment, true>,
      grants as never,
      models as never,
    ),
    grants,
    models,
  };
}

describe('ModelGatewayController', () => {
  it('accepts only the Agent Runtime service identity', async () => {
    const { controller, grants, models } = createController();

    const result = await controller.invoke(
      'test-internal-token-with-at-least-32-characters',
      'agent-runtime',
      REQUEST,
    );

    expect(grants.verify).toHaveBeenCalledWith(REQUEST.grant);
    expect(models.invoke).toHaveBeenCalledWith(expect.any(Object), REQUEST);
    expect(result).toEqual({ content: '{"ok":true}' });
  });

  it('rejects missing or invalid internal identity', async () => {
    const { controller, models } = createController();

    await expect(controller.invoke(undefined, 'agent-runtime', REQUEST)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_SERVICE_IDENTITY' }),
    });
    await expect(
      controller.invoke('test-internal-token-with-at-least-32-characters', 'browser', REQUEST),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_SERVICE_IDENTITY' }),
    });
    expect(models.invoke).not.toHaveBeenCalled();
  });
});
