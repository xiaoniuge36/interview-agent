import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_BYTES = 16;

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(PASSWORD_SALT_BYTES);
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return `${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [encodedSalt, encodedKey] = storedHash.split('$');
  if (!encodedSalt || !encodedKey) return false;
  try {
    const salt = Buffer.from(encodedSalt, 'base64url');
    const storedKey = Buffer.from(encodedKey, 'base64url');
    const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
    return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
  } catch {
    return false;
  }
}