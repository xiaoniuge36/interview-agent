import { ConflictException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { jwtVerify } from 'jose';
import type { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import type { PrismaService } from '../database/prisma.service';
import { LocalAuthService } from './local-auth.service';

const JWT_SECRET = 'local-auth-test-secret-with-at-least-thirty-two-bytes';
const JWT_ISSUER = 'interview-agent-tests';
const JWT_AUDIENCE = 'interview-agent-web';
const registration = {
  name: 'Avery Lin',
  email: 'avery@example.com',
  password: 'secure-password1',
};

describe('LocalAuthService', () => {
  it('创建凭据、签发令牌，并支持同一密码登录', async () => {
    const database = localAuthDatabase();
    const service = localAuthService(database);
    const { registered, signedIn } = await registerThenSignIn(service, database);

    expectCreatedCredential(database);
    expect(registered.identity).toEqual(expectedIdentity());
    expect(signedIn.identity).toEqual(registered.identity);
    await expect(verifiedToken(registered.accessToken)).resolves.toMatchObject({
      payload: expect.objectContaining(expectedTokenClaims()),
    });
  });

  it('将重复邮箱转换为可预期的冲突错误', async () => {
    const database = localAuthDatabase();
    database.$transaction.mockImplementationOnce(() => Promise.reject(uniqueConstraint()));
    const service = localAuthService(database);

    await expect(service.register(registration)).rejects.toBeInstanceOf(ConflictException);
  });

  it('拒绝错误密码，且不泄露账号是否存在', async () => {
    const database = localAuthDatabase();
    database.localCredential.findUnique.mockResolvedValue(null);
    const service = localAuthService(database);

    await expect(
      service.signIn({ email: registration.email, password: registration.password }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('仅在 HS256 模式启用本地账号入口', async () => {
    const database = localAuthDatabase();
    const service = localAuthService(database, 'development');

    await expect(service.register(registration)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

function localAuthService(database: LocalAuthDatabase, mode: 'development' | 'jwt_hs256' = 'jwt_hs256') {
  const values = {
    AUTH_MODE: mode,
    JWT_SECRET,
    JWT_ISSUER,
    JWT_AUDIENCE,
  };
  const config = {
    get: jest.fn((key: keyof typeof values) => values[key]),
    getOrThrow: jest.fn((key: keyof typeof values) => values[key]),
  };
  return new LocalAuthService(
    config as unknown as ConfigService<Environment, true>,
    database as unknown as PrismaService,
  );
}

type LocalAuthDatabase = ReturnType<typeof localAuthDatabase>;

function localAuthDatabase() {
  const transaction = {
    tenant: {
      create: jest.fn().mockResolvedValue({ id: 'tenant-1', slug: 'member-avery' }),
    },
    user: {
      create: jest.fn().mockResolvedValue({
        id: 'user-1',
        subject: 'local:user-1',
        role: 'user',
        email: registration.email,
        name: registration.name,
      }),
    },
    localCredential: {
      create: jest.fn().mockResolvedValue({ id: 'credential-1' }),
    },
  };
  return {
    transaction,
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) => callback(transaction)),
    localCredential: { findUnique: jest.fn() },
    tenant: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  };
}

async function registerThenSignIn(service: LocalAuthService, database: LocalAuthDatabase) {
  const registered = await service.register(registration);
  const passwordHash = credentialData(database).passwordHash;
  database.localCredential.findUnique.mockResolvedValue({
    tenantId: 'tenant-1',
    userId: 'user-1',
    passwordHash,
  });
  database.tenant.findUnique.mockResolvedValue({ slug: 'member-avery' });
  database.user.findUnique.mockResolvedValue({
    subject: 'local:user-1',
    role: 'user',
    email: registration.email,
    name: registration.name,
  });
  const signedIn = await service.signIn({
    email: registration.email,
    password: registration.password,
  });
  return { registered, signedIn };
}

function expectCreatedCredential(database: LocalAuthDatabase) {
  expect(database.transaction.localCredential.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        email: registration.email,
        passwordHash: expect.not.stringContaining(registration.password),
      }),
    }),
  );
}

function expectedIdentity() {
  return { subject: 'local:user-1', displayName: registration.name, role: 'user' };
}

function expectedTokenClaims() {
  return {
    sub: 'local:user-1',
    tenant_id: 'member-avery',
    role: 'user',
    email: registration.email,
  };
}

function credentialData(database: LocalAuthDatabase) {
  const call = database.transaction.localCredential.create.mock.calls[0]?.[0];
  if (!call) throw new Error('expected local credential to be created');
  return call.data;
}

function uniqueConstraint() {
  return new Prisma.PrismaClientKnownRequestError('unique', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

function verifiedToken(token: string) {
  return jwtVerify(token, new TextEncoder().encode(JWT_SECRET), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithms: ['HS256'],
  });
}