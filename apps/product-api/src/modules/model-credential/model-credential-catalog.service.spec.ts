import type { ProductRequestContext } from '../../common/context/request-context';
import { ModelProviderError } from './model-provider.client';
import { ModelCredentialCatalogService } from './model-credential-catalog.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-0001',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'subject-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['model_credential:read', 'model_credential:write', 'model_credential:test'],
  },
};

const credentialRecord = {
  id: 'credential-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  provider: 'openai_compatible',
  model: 'glm-test',
  baseUrl: 'https://gateway.example.test/v1',
  status: 'verified',
};

function createService() {
  const prisma = {
    userModelCredential: { findFirst: jest.fn().mockResolvedValue(credentialRecord) },
  };
  const policy = { assert: jest.fn() };
  const crypto = { decrypt: jest.fn().mockReturnValue('sk-stored-secret') };
  const connectionTester = {
    listModels: jest.fn().mockResolvedValue([{ id: 'glm-test', label: 'GLM Test' }]),
  };
  const service = new ModelCredentialCatalogService(
    { prisma, policy } as never,
    crypto as never,
    connectionTester as never,
  );
  return { service, prisma, policy, crypto, connectionTester };
}

describe('ModelCredentialCatalogService key resolution', () => {
  it('reads the catalog with the API key typed into an unsaved connection form', async () => {
    const { service, prisma, connectionTester } = createService();

    const models = await service.discover(context, {
      provider: 'qwen',
      apiKey: 'sk-form-secret',
    });

    expect(models).toEqual([{ id: 'glm-test', label: 'GLM Test' }]);
    expect(prisma.userModelCredential.findFirst).not.toHaveBeenCalled();
    expect(connectionTester.listModels).toHaveBeenCalledWith(
      { provider: 'qwen', baseUrl: null, apiKey: 'sk-form-secret' },
      'sk-form-secret',
    );
  });

  it('reuses the stored key and endpoint when the form leaves the API key blank', async () => {
    const { service, connectionTester } = createService();

    await service.discover(context, {
      provider: 'openai_compatible',
      credentialId: 'credential-1',
    });

    expect(connectionTester.listModels).toHaveBeenCalledWith(
      {
        provider: 'openai_compatible',
        baseUrl: 'https://gateway.example.test/v1',
        apiKey: 'sk-stored-secret',
      },
      'sk-stored-secret',
    );
  });
});

describe('ModelCredentialCatalogService guards', () => {
  it('requires the test permission before calling any provider', async () => {
    const { service, policy, connectionTester } = createService();
    policy.assert.mockImplementation(() => {
      throw new Error('PERMISSION_DENIED');
    });

    await expect(
      service.discover(context, { provider: 'qwen', apiKey: 'sk-form-secret' }),
    ).rejects.toThrow('PERMISSION_DENIED');
    expect(connectionTester.listModels).not.toHaveBeenCalled();
  });

  it('returns an actionable error when the provider rejects the key', async () => {
    const { service, connectionTester } = createService();
    connectionTester.listModels.mockRejectedValue(
      new ModelProviderError('MODEL_PROVIDER_AUTH_FAILED'),
    );

    await expect(
      service.discover(context, { provider: 'openai', apiKey: 'sk-bad-secret' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'MODEL_PROVIDER_AUTH_FAILED',
        message: '模型服务拒绝了当前密钥，无法获取模型列表。',
      }),
    });
  });
});
