import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { jwtVerify } from 'jose';
import { AuthIdentityService } from './auth-identity.service';
import type { IdentityProvisioner } from './identity-provisioner';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

const actor = {
  id: 'user-1',
  subject: 'demo-user',
  tenantId: 'tenant-1',
  role: 'user' as const,
  scopes: [],
};

const tokenClaims = {
  sub: 'auth0|abc',
  tenant_id: 'acme',
  role: 'admin',
  email: 'admin@acme.dev',
  name: 'Acme Admin',
};

const hs256Config = {
  AUTH_MODE: 'jwt_hs256',
  JWT_SECRET: 'test-secret',
  JWT_ISSUER: 'issuer',
  JWT_AUDIENCE: 'audience',
};

afterEach(() => jest.clearAllMocks());

test('provisions the demo user by default in development mode', async () => {
  const { service, provisioner } = buildService({ AUTH_MODE: 'development' });

  await expect(service.resolve(request())).resolves.toBe(actor);
  expect(provisioner.resolve).toHaveBeenCalledWith({
    subject: 'demo-user',
    tenantSlug: 'demo',
    role: 'user',
    name: 'Demo User',
  });
});

test('honours the x-development-actor header for platform administrators', async () => {
  const { service, provisioner } = buildService({ AUTH_MODE: 'development' });

  await service.resolve(request({ 'x-development-actor': 'platform_admin' }));

  expect(provisioner.resolve).toHaveBeenCalledWith(
    expect.objectContaining({ subject: 'demo-platform-admin', role: 'platform_admin' }),
  );
});

test('rejects unsupported development actors with the aligned copy', async () => {
  const { service } = buildService({ AUTH_MODE: 'development' });

  const error = await rejection(service.resolve(request({ 'x-development-actor': 'support' })));

  expect(error).toBeInstanceOf(UnauthorizedException);
  expect((error as UnauthorizedException).getResponse()).toMatchObject({
    code: 'INVALID_DEVELOPMENT_IDENTITY',
    message: '开发身份仅允许 user、admin 或 platform_admin。',
  });
});

test('verifies HS256 bearer tokens and provisions the mapped identity', async () => {
  (jwtVerify as jest.Mock).mockResolvedValue({ payload: tokenClaims });
  const { service, provisioner } = buildService(hs256Config);

  await expect(service.resolve(request({ authorization: 'Bearer token-1' }))).resolves.toBe(actor);

  expect(jwtVerify).toHaveBeenCalledWith(
    'token-1',
    expect.anything(),
    expect.objectContaining({ algorithms: ['HS256'], issuer: 'issuer', audience: 'audience' }),
  );
  expect(provisioner.resolve).toHaveBeenCalledWith({
    subject: 'auth0|abc',
    tenantSlug: 'acme',
    role: 'admin',
    email: 'admin@acme.dev',
    name: 'Acme Admin',
  });
});

test('requires a bearer token outside development mode', async () => {
  const { service, provisioner } = buildService(hs256Config);

  const error = await rejection(service.resolve(request()));

  expect(error).toBeInstanceOf(UnauthorizedException);
  expect((error as UnauthorizedException).getResponse()).toMatchObject({
    code: 'AUTHENTICATION_REQUIRED',
  });
  expect(provisioner.resolve).not.toHaveBeenCalled();
});

test('maps token verification failures to INVALID_ACCESS_TOKEN', async () => {
  (jwtVerify as jest.Mock).mockRejectedValue(new Error('token expired'));
  const { service } = buildService(hs256Config);

  const error = await rejection(service.resolve(request({ authorization: 'Bearer expired' })));

  expect(error).toBeInstanceOf(UnauthorizedException);
  expect((error as UnauthorizedException).getResponse()).toMatchObject({
    code: 'INVALID_ACCESS_TOKEN',
  });
});

test('rejects verified payloads that fail the identity claims schema', async () => {
  (jwtVerify as jest.Mock).mockResolvedValue({ payload: { sub: 'auth0|abc' } });
  const { service } = buildService(hs256Config);

  const error = await rejection(service.resolve(request({ authorization: 'Bearer partial' })));

  expect(error).toBeInstanceOf(UnauthorizedException);
  expect((error as UnauthorizedException).getResponse()).toMatchObject({
    code: 'INVALID_ACCESS_TOKEN',
  });
});

test('verifies OIDC tokens through the remote key set with RS256', async () => {
  (jwtVerify as jest.Mock).mockResolvedValue({ payload: tokenClaims });
  const { service } = buildService({
    AUTH_MODE: 'oidc',
    OIDC_JWKS_URL: 'https://issuer.dev/jwks',
    OIDC_ISSUER_URL: 'https://issuer.dev',
    OIDC_AUDIENCE: 'product-api',
  });

  await expect(service.resolve(request({ authorization: 'Bearer token-2' }))).resolves.toBe(actor);

  expect(jwtVerify).toHaveBeenCalledWith(
    'token-2',
    expect.any(Function),
    expect.objectContaining({
      algorithms: ['RS256'],
      issuer: 'https://issuer.dev',
      audience: 'product-api',
    }),
  );
});

function buildService(values: Record<string, unknown>) {
  const provisioner = { resolve: jest.fn().mockResolvedValue(actor) };
  const config = {
    get: jest.fn((key: string) => values[key]),
    getOrThrow: jest.fn((key: string) => {
      if (values[key] === undefined) throw new Error(`missing config ${key}`);
      return values[key];
    }),
  };
  const service = new AuthIdentityService(
    config as never,
    provisioner as unknown as IdentityProvisioner,
  );
  return { service, provisioner };
}

function request(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function rejection(promise: Promise<unknown>) {
  return promise.then(
    () => null,
    (reason: unknown) => reason,
  );
}
