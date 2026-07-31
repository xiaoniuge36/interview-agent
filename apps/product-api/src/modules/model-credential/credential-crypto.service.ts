import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../common/config/environment';
import { decodeCanonicalBase64 } from '../../common/security/base64-key';

export type EncryptedCredential = {
  ciphertext: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  authTag: Uint8Array<ArrayBuffer>;
  keyVersion: number;
};

const AES_256_KEY_BYTES = 32;
const GCM_IV_BYTES = 12;

@Injectable()
export class CredentialCryptoService {
  private readonly currentKey: Buffer;
  private readonly previousKey: Buffer | undefined;
  private readonly version: number;

  constructor(config: ConfigService<Environment, true>) {
    const current =
      config.get('CREDENTIAL_ENCRYPTION_KEY_CURRENT', { infer: true }) ??
      config.get('CREDENTIAL_ENCRYPTION_KEY', { infer: true });
    if (!current) throw new Error('CREDENTIAL_ENCRYPTION_KEY_CURRENT 未配置。');
    this.currentKey = decodeKey(current);
    const previous = config.get('CREDENTIAL_ENCRYPTION_KEY_PREVIOUS', { infer: true });
    this.previousKey = previous ? decodeKey(previous) : undefined;
    this.version = config.get('CREDENTIAL_ENCRYPTION_KEY_VERSION', { infer: true });
  }

  encrypt(secret: string): EncryptedCredential {
    const iv = copyBytes(randomBytes(GCM_IV_BYTES));
    const cipher = createCipheriv('aes-256-gcm', this.currentKey, iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return {
      ciphertext: copyBytes(ciphertext),
      iv,
      authTag: copyBytes(cipher.getAuthTag()),
      keyVersion: this.version,
    };
  }

  decrypt(value: EncryptedCredential): string {
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.keyFor(value.keyVersion), value.iv);
      decipher.setAuthTag(Buffer.from(value.authTag));
      return Buffer.concat([decipher.update(value.ciphertext), decipher.final()]).toString('utf8');
    } catch {
      throw new Error('凭证密文校验失败');
    }
  }

  private keyFor(version: number) {
    if (version === this.version) return this.currentKey;
    if (version === this.version - 1 && this.previousKey) return this.previousKey;
    throw new Error('凭证密钥版本已过期');
  }
}

function decodeKey(value: string): Buffer {
  const key = decodeCanonicalBase64(value);
  if (!key || key.length !== AES_256_KEY_BYTES) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY 必须是 32 字节 base64 值。');
  }
  return key;
}

function copyBytes(value: Uint8Array): Uint8Array<ArrayBuffer> {
  const copied = new Uint8Array(value.byteLength);
  copied.set(value);
  return copied;
}
