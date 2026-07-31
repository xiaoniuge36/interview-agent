import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../common/config/environment';
import { CredentialCryptoService } from './credential-crypto.service';

const MASTER_KEY = Buffer.alloc(32, 7).toString('base64');
const PREVIOUS_KEY = Buffer.alloc(32, 6).toString('base64');

function createService(input: { current?: string; previous?: string; version?: number } = {}) {
  const values = {
    CREDENTIAL_ENCRYPTION_KEY: input.current ?? MASTER_KEY,
    CREDENTIAL_ENCRYPTION_KEY_CURRENT: input.current ?? MASTER_KEY,
    CREDENTIAL_ENCRYPTION_KEY_PREVIOUS: input.previous,
    CREDENTIAL_ENCRYPTION_KEY_VERSION: input.version ?? 1,
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

  it('writes with the current key and reads the immediately previous key version', () => {
    const previous = createService({ current: PREVIOUS_KEY, version: 1 });
    const oldCiphertext = previous.encrypt('sk-old-secret');
    const current = createService({ current: MASTER_KEY, previous: PREVIOUS_KEY, version: 2 });

    expect(current.decrypt(oldCiphertext)).toBe('sk-old-secret');
    expect(current.encrypt('sk-new-secret').keyVersion).toBe(2);
  });

  it('rejects ciphertext older than the immediately previous key version', () => {
    const expired = createService({ current: PREVIOUS_KEY, version: 1 }).encrypt('sk-expired');
    const current = createService({ current: MASTER_KEY, previous: PREVIOUS_KEY, version: 3 });

    expect(() => current.decrypt(expired)).toThrow('凭证密文校验失败');
  });

  it('rejects a key containing non-base64 characters even when it decodes to 32 bytes', () => {
    expect(() => createService({ current: `${MASTER_KEY}!` })).toThrow(
      'CREDENTIAL_ENCRYPTION_KEY 必须是 32 字节 base64 值',
    );
  });
});
