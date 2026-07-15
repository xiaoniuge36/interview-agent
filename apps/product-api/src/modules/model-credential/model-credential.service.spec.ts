import type { ProductRequestContext } from '../../common/context/request-context';
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
    userModelCredential: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue(credentialRecord),
      update: jest.fn().mockResolvedValue({ ...credentialRecord, status: 'verified' }),
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
  const provider = { testConnection: jest.fn().mockResolvedValue(undefined) };
  const service = new ModelCredentialService(
    prisma as never,
    policy as never,
    audit as never,
    crypto as never,
    provider as never,
  );
  return { service, transaction, prisma, crypto, provider };
}

describe('ModelCredentialService', () => {
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
        data: expect.objectContaining({ ciphertext: Buffer.from('ciphertext'), keyHint: '••••cret' }),
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

  it('tests an owned connection with decrypted key and persists the verified status', async () => {
    const { service, transaction, provider } = createService();

    const result = await service.testConnection(context, 'credential-1');

    expect(provider.testConnection).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'openai', apiKey: 'sk-real-secret' }),
    );
    expect(transaction.userModelCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'verified' }) }),
    );
    expect(result).toEqual(expect.objectContaining({ status: 'verified' }));
  });
});
