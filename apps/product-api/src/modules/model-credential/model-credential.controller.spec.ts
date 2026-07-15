import { ModelCredentialController } from './model-credential.controller';

const context = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: { id: 'user-1', role: 'user' },
};

describe('ModelCredentialController', () => {
  it('passes a one-time create payload to the authenticated user service', async () => {
    const service = { create: jest.fn().mockResolvedValue({ id: 'credential-1' }) };
    const controller = new ModelCredentialController(service as never);

    await controller.create({ context } as never, {
      provider: 'openai',
      model: 'gpt-4.1',
      apiKey: 'sk-real-secret',
      isDefault: true,
    });

    expect(service.create).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ apiKey: 'sk-real-secret', provider: 'openai' }),
    );
  });
});
