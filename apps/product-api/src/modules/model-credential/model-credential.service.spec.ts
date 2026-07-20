import type { ProductRequestContext } from '../../common/context/request-context';
import { ModelProviderError } from './model-provider.client';
import { ModelCredentialService } from './model-credential.service';

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
  provider: 'openai',
  model: 'gpt-4.1',
  baseUrl: null,
  ciphertext: Buffer.from('ciphertext'),
  iv: Buffer.alloc(12),
  authTag: Buffer.alloc(16),
  keyVersion: 1,
  keyHint: '••••7K9m',
  status: 'verified',
  isDefault: true,
  lastTestedAt: new Date('2026-07-15T00:00:00.000Z'),
  lastErrorCode: null,
  createdAt: new Date('2026-07-15T00:00:00.000Z'),
  updatedAt: new Date('2026-07-15T00:00:00.000Z'),
};

function createService() {
  const transaction = {
    aiInvocation: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    userModelCredential: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findFirst: jest.fn().mockResolvedValue(credentialRecord),
      create: jest.fn().mockResolvedValue(credentialRecord),
      update: jest.fn().mockResolvedValue({ ...credentialRecord, status: 'verified' }),
      delete: jest.fn().mockResolvedValue(credentialRecord),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback) => callback(transaction)),
    userModelCredential: {
      findFirst: jest.fn().mockResolvedValue(credentialRecord),
    },
  };
  const policy = { assert: jest.fn() };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const crypto = {
    encrypt: jest.fn().mockReturnValue({
      ciphertext: Buffer.from('ciphertext'),
      iv: Buffer.alloc(12),
      authTag: Buffer.alloc(16),
      keyVersion: 1,
    }),
    decrypt: jest.fn().mockReturnValue('sk-real-secret'),
  };
  const connectionTester = { test: jest.fn().mockResolvedValue(undefined) };
  const service = new ModelCredentialService(
    { prisma, policy, audit } as never,
    crypto as never,
    connectionTester as never,
  );
  return { service, transaction, prisma, crypto, connectionTester };
}

describe('ModelCredentialService storage', () => {
  it('encrypts a user key before persisting and returns only a masked view', async () => {
    const { service, transaction, crypto } = createService();

    const result = await service.create(context, {
      provider: 'openai',
      model: 'gpt-4.1',
      apiKey: 'sk-real-secret',
      isDefault: true,
    });

    expect(crypto.encrypt).toHaveBeenCalledWith('sk-real-secret');
    expect(transaction.userModelCredential.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ciphertext: Buffer.from('ciphertext'),
          keyHint: '••••cret',
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: 'credential-1', keyHint: '••••7K9m' }));
    expect(JSON.stringify(result)).not.toContain('sk-real-secret');
  });

  it('resolves and decrypts only the caller default verified credential', async () => {
    const { service, prisma, crypto } = createService();

    const result = await service.resolveDefault(context);

    if (!result) throw new Error('expected a default credential');

    expect(prisma.userModelCredential.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1', isDefault: true }),
      }),
    );
    expect(crypto.decrypt).toHaveBeenCalledWith(
      expect.objectContaining({ ciphertext: Buffer.from('ciphertext') }),
    );
    expect(result.apiKey).toBe('sk-real-secret');
  });
});

describe('ModelCredentialService connection tests', () => {
  it('tests an owned connection with decrypted key and persists the verified status', async () => {
    const { service, transaction, connectionTester } = createService();

    const result = await service.testConnection(context, 'credential-1');

    expect(connectionTester.test).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ id: 'credential-1', provider: 'openai' }),
      'sk-real-secret',
    );
    expect(transaction.userModelCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'verified' }) }),
    );
    expect(result).toEqual(expect.objectContaining({ status: 'verified' }));
  });

  it('persists a failed connection test and returns an actionable provider error', async () => {
    const { service, transaction, connectionTester } = createService();
    connectionTester.test.mockRejectedValue(new ModelProviderError('MODEL_PROVIDER_AUTH_FAILED'));

    await expect(service.testConnection(context, 'credential-1')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'MODEL_PROVIDER_AUTH_FAILED',
        message: '模型服务拒绝了当前密钥，请检查 API Key 后重试。',
      }),
    });
    expect(transaction.userModelCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          lastErrorCode: 'MODEL_PROVIDER_AUTH_FAILED',
          lastTestedAt: expect.any(Date),
        }),
      }),
    );
  });
});

describe('ModelCredentialService lifecycle', () => {
  it('requires a new test after changing model connection details', async () => {
    const { service, transaction } = createService();

    await service.update(context, 'credential-1', {
      model: 'gpt-4.1-mini',
      baseUrl: 'https://gateway.example.com/v1',
    });

    expect(transaction.userModelCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          model: 'gpt-4.1-mini',
          baseUrl: 'https://gateway.example.com/v1',
          status: 'unverified',
          lastErrorCode: null,
          lastTestedAt: null,
        }),
      }),
    );
  });

  it('promotes another verified connection after deleting the default one', async () => {
    const { service, transaction } = createService();
    transaction.userModelCredential.findFirst
      .mockResolvedValueOnce(credentialRecord)
      .mockResolvedValueOnce({ ...credentialRecord, id: 'credential-2', isDefault: false });

    await service.remove(context, 'credential-1');

    expect(transaction.aiInvocation.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', userId: 'user-1', credentialId: 'credential-1' },
      data: { credentialId: null },
    });
    expect(transaction.userModelCredential.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: 'tenant-1', id: 'credential-2' } },
      data: { isDefault: true },
    });
  });
});

describe('ModelCredentialService provider changes', () => {
  it('resets verification and clears the custom endpoint when changing provider', async () => {
    const { service, transaction } = createService();

    await service.update(context, 'credential-1', {
      provider: 'qwen',
      model: 'qwen-plus',
    });

    expect(transaction.userModelCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: 'qwen',
          model: 'qwen-plus',
          baseUrl: null,
          status: 'unverified',
          lastTestedAt: null,
          lastErrorCode: null,
        }),
      }),
    );
  });
});
