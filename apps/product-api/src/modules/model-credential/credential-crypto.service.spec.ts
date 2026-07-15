import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../common/config/environment';
import { CredentialCryptoService } from './credential-crypto.service';

const MASTER_KEY = Buffer.alloc(32, 7).toString('base64');

function createService() {
  const values = {
    CREDENTIAL_ENCRYPTION_KEY: MASTER_KEY,
    CREDENTIAL_ENCRYPTION_KEY_VERSION: 1,
  };
  const config = {
    get: jest.fn((key: keyof typeof values) => values[key]),
  };
  return new CredentialCryptoService(config as unknown as ConfigService<Environment, true>);
}

describe('CredentialCryptoService', () => {
  it('round-trips a secret with fresh authenticated ciphertext', () => {
    const service = createService();

    const first = service.encrypt('sk-secret-value');
    const second = service.encrypt('sk-secret-value');

    expect(service.decrypt(first)).toBe('sk-secret-value');
    expect(Buffer.from(first.ciphertext).equals(Buffer.from(second.ciphertext))).toBe(false);
    expect(first.iv).toHaveLength(12);
    expect(first.authTag).toHaveLength(16);
    expect(first.keyVersion).toBe(1);
  });

  it('rejects altered ciphertext', () => {
    const service = createService();
    const encrypted = service.encrypt('sk-secret-value');
    encrypted.ciphertext[0] = (encrypted.ciphertext[0] ?? 0) ^ 1;

    expect(() => service.decrypt(encrypted)).toThrow('凭证密文校验失败');
  });
});
