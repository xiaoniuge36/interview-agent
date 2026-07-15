import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { hashPassword, verifyPassword } from './password-hash';
import type { Environment } from '../config/environment';
import { PrismaService } from '../database/prisma.service';
import type { LocalRegistrationInput, LocalSignInInput } from './local-auth.input';

const TOKEN_LIFETIME_SECONDS = 28_800;
const MILLISECONDS_PER_SECOND = 1_000;
const PERSONAL_TENANT_PREFIX = 'member';

type SessionAccount = {
  tenant: { slug: string };
  user: { subject: string; role: string; email: string | null; name: string | null };
};

export type LocalAuthSession = {
  accessToken: string;
  expiresAt: string;
  identity: {
    subject: string;
    displayName: string;
    role: string;
  };
};

@Injectable()
export class LocalAuthService {
  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
  ) {}

  async register(input: LocalRegistrationInput): Promise<LocalAuthSession> {
    this.assertLocalAuthEnabled();
    const passwordHash = await hashPassword(input.password);

    try {
      const account = await this.prisma.$transaction(async (transaction) => {
        const tenant = await transaction.tenant.create({
          data: {
            slug: personalTenantSlug(),
            name: `${input.name} 的个人空间`,
          },
          select: { id: true, slug: true },
        });
        const user = await transaction.user.create({
          data: {
            tenant: { connect: { slug: tenant.slug } },
            subject: `local:${randomUUID()}`,
            role: 'user',
            email: input.email,
            name: input.name,
          },
          select: { id: true, subject: true, role: true, email: true, name: true },
        });
        await transaction.localCredential.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            email: input.email,
            passwordHash,
          },
        });
        return { tenant, user };
      });
      return this.createSession(account);
    } catch (error) {
      if (isUniqueConstraint(error)) {
        throw new ConflictException({
          code: 'ACCOUNT_ALREADY_EXISTS',
          message: '该邮箱已注册，可直接登录。',
        });
      }
      throw error;
    }
  }

  async signIn(input: LocalSignInInput): Promise<LocalAuthSession> {
    this.assertLocalAuthEnabled();
    const credential = await this.prisma.localCredential.findUnique({
      where: { email: input.email },
      select: { tenantId: true, userId: true, passwordHash: true },
    });
    const validPassword = credential
      ? await verifyPassword(input.password, credential.passwordHash)
      : false;
    if (!credential || !validPassword) throw invalidCredentials();

    const [tenant, user] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: credential.tenantId },
        select: { slug: true },
      }),
      this.prisma.user.findUnique({
        where: {
          tenantId_id: { tenantId: credential.tenantId, id: credential.userId },
        },
        select: { subject: true, role: true, email: true, name: true },
      }),
    ]);
    if (!tenant || !user) throw invalidCredentials();
    return this.createSession({ tenant, user });
  }

  private async createSession(account: SessionAccount): Promise<LocalAuthSession> {
    const now = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
    const expiresAt = new Date(
      (now + TOKEN_LIFETIME_SECONDS) * MILLISECONDS_PER_SECOND,
    ).toISOString();
    const secret = this.config.getOrThrow('JWT_SECRET', { infer: true });
    const issuer = this.config.getOrThrow('JWT_ISSUER', { infer: true });
    const audience = this.config.getOrThrow('JWT_AUDIENCE', { infer: true });
    const accessToken = await new SignJWT({
      tenant_id: account.tenant.slug,
      role: account.user.role,
      email: account.user.email ?? undefined,
      name: account.user.name ?? undefined,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(account.user.subject)
      .setIssuedAt(now)
      .setExpirationTime(now + TOKEN_LIFETIME_SECONDS)
      .setIssuer(issuer)
      .setAudience(audience)
      .sign(new TextEncoder().encode(secret));
    return {
      accessToken,
      expiresAt,
      identity: {
        subject: account.user.subject,
        displayName: account.user.name ?? account.user.email ?? account.user.subject,
        role: account.user.role,
      },
    };
  }

  private assertLocalAuthEnabled() {
    if (this.config.get('AUTH_MODE', { infer: true }) === 'jwt_hs256') return;
    throw new ServiceUnavailableException({
      code: 'LOCAL_AUTH_DISABLED',
      message: '本地账号登录未启用，请配置 AUTH_MODE=jwt_hs256。',
    });
  }
}

function personalTenantSlug() {
  return `${PERSONAL_TENANT_PREFIX}-${randomUUID().replaceAll('-', '')}`;
}

function isUniqueConstraint(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function invalidCredentials() {
  return new UnauthorizedException({
    code: 'INVALID_CREDENTIALS',
    message: '邮箱或密码不正确。',
  });
}
