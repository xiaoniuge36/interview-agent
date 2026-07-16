import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';
import type { Actor } from '@interview-agent/contracts';
import type { Environment } from '../config/environment';
import { IdentityProvisioner, type IdentityProvisioningInput } from './identity-provisioner';

const IDENTITY_TEXT_MAX_LENGTH = 200;
const EMAIL_MAX_LENGTH = 320;
const TenantClaimSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{1,63}$/);
const IdentityClaimsSchema = z.object({
  sub: z.string().trim().min(1).max(IDENTITY_TEXT_MAX_LENGTH),
  tenant_id: TenantClaimSchema,
  role: z.enum(['user', 'question_reviewer', 'admin', 'platform_admin', 'support']),
  email: z.string().email().max(EMAIL_MAX_LENGTH).optional(),
  name: z.string().trim().min(1).max(IDENTITY_TEXT_MAX_LENGTH).optional(),
});
const DevelopmentActorSchema = z.enum(['user', 'admin', 'platform_admin']);

type IdentityClaims = z.infer<typeof IdentityClaimsSchema>;

@Injectable()
export class AuthIdentityService {
  private readonly remoteKeySet: JWTVerifyGetKey | undefined;

  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly provisioner: IdentityProvisioner,
  ) {
    const jwksUrl = this.config.get('OIDC_JWKS_URL', { infer: true });
    this.remoteKeySet = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : undefined;
  }

  async resolve(request: Request): Promise<Actor> {
    const mode = this.config.get('AUTH_MODE', { infer: true });
    const identity =
      mode === 'development'
        ? this.developmentIdentity(request)
        : await this.tokenIdentity(request, mode);
    return this.provisioner.resolve(provisioningInput(identity));
  }

  private developmentIdentity(request: Request): IdentityClaims {
    const result = DevelopmentActorSchema.safeParse(
      request.headers['x-development-actor'] ?? 'user',
    );
    if (!result.success) {
      throw unauthorized('INVALID_DEVELOPMENT_IDENTITY', '开发身份仅允许 user 或 admin。');
    }
    return developmentIdentity(result.data);
  }

  private async tokenIdentity(
    request: Request,
    mode: 'jwt_hs256' | 'oidc',
  ): Promise<IdentityClaims> {
    const token = bearerToken(request.headers.authorization);
    try {
      const payload =
        mode === 'oidc' ? await this.verifyOidc(token) : await this.verifyHs256(token);
      return IdentityClaimsSchema.parse(payload);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw unauthorized('INVALID_ACCESS_TOKEN', '访问令牌无效或已过期。');
    }
  }

  private async verifyHs256(token: string): Promise<JWTPayload> {
    const secret = this.config.getOrThrow('JWT_SECRET', { infer: true });
    const issuer = this.config.getOrThrow('JWT_ISSUER', { infer: true });
    const audience = this.config.getOrThrow('JWT_AUDIENCE', { infer: true });
    const verified = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer,
      audience,
      algorithms: ['HS256'],
    });
    return verified.payload;
  }

  private async verifyOidc(token: string): Promise<JWTPayload> {
    if (!this.remoteKeySet) throw new Error('OIDC JWKS is not configured');
    const issuer = this.config.getOrThrow('OIDC_ISSUER_URL', { infer: true });
    const audience = this.config.getOrThrow('OIDC_AUDIENCE', { infer: true });
    const verified = await jwtVerify(token, this.remoteKeySet, {
      issuer,
      audience,
      algorithms: ['RS256'],
    });
    return verified.payload;
  }
}

function developmentIdentity(role: z.infer<typeof DevelopmentActorSchema>): IdentityClaims {
  if (role === 'platform_admin') {
    return {
      sub: 'demo-platform-admin',
      tenant_id: 'demo',
      role,
      name: 'Demo Platform Admin',
    };
  }
  return {
    sub: role === 'admin' ? 'demo-admin' : 'demo-user',
    tenant_id: 'demo',
    role,
    name: role === 'admin' ? 'Demo Admin' : 'Demo User',
  };
}

function provisioningInput(identity: IdentityClaims): IdentityProvisioningInput {
  return {
    subject: identity.sub,
    tenantSlug: identity.tenant_id,
    role: identity.role,
    ...(identity.email === undefined ? {} : { email: identity.email }),
    ...(identity.name === undefined ? {} : { name: identity.name }),
  };
}

function bearerToken(authorization: string | undefined) {
  if (!authorization?.startsWith('Bearer ')) {
    throw unauthorized('AUTHENTICATION_REQUIRED', '缺少有效的 Bearer token。');
  }
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) throw unauthorized('AUTHENTICATION_REQUIRED', '缺少有效的 Bearer token。');
  return token;
}

function unauthorized(code: string, message: string) {
  return new UnauthorizedException({ code, message });
}
