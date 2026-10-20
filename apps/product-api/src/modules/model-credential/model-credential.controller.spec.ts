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
    const controller = new ModelCredentialController(service as never, catalog() as never);

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

  it('validates the discovery payload before asking the catalog service for models', async () => {
    const service = { create: jest.fn() };
    const discovery = catalog();
    const controller = new ModelCredentialController(service as never, discovery as never);

    await controller.availableModels({ context } as never, {
      provider: 'deepseek',
      apiKey: 'sk-one-time-secret',
    });

    expect(discovery.discover).toHaveBeenCalledWith(context, {
      provider: 'deepseek',
      apiKey: 'sk-one-time-secret',
    });
  });

  it('rejects a discovery payload without a key or a saved connection', () => {
    const controller = new ModelCredentialController({} as never, catalog() as never);

    expect(() =>
      controller.availableModels({ context } as never, { provider: 'deepseek' }),
    ).toThrow();
  });
});

function catalog() {
  return {
    discover: jest.fn().mockResolvedValue([{ id: 'deepseek-chat', label: 'deepseek-chat' }]),
  };
}
