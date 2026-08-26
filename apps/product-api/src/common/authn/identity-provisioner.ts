import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Actor, Role } from '@interview-agent/contracts';
import type { Prisma } from '@prisma/client';
import { actorFromIdentity } from '../context/request-context';
import { PrismaService } from '../database/prisma.service';
import { runSerializable } from '../database/serializable-transaction';

const ACTOR_SELECT = { id: true, subject: true, role: true, tenantId: true } as const;
const IDENTITY_SELECT = {
  ...ACTOR_SELECT,
  email: true,
  name: true,
  status: true,
  lastSignedInAt: true,
} as const;
/** lastSignedInAt 只在超过该间隔（5 分钟）后才回写，避免每个请求都产生一次热点 update。 */
const SIGN_IN_REFRESH_INTERVAL_MS = 300_000;
/** 已解析 Actor 的进程内缓存 TTL，短于账号治理（禁用/改角色）可容忍的生效延迟。 */
const ACTOR_CACHE_TTL_MS = 30_000;
const ACTOR_CACHE_MAX_ENTRIES = 10_000;

export type IdentityProvisioningInput = {
  subject: string;
  tenantSlug: string;
  role: Role;
  email?: string;
  name?: string;
};

type StoredIdentity = {
  id: string;
  subject: string;
  tenantId: string;
  role: string;
  email: string | null;
  name: string | null;
  status: string;
  lastSignedInAt: Date | null;
};

type CachedActor = {
  actor: Actor;
  email: string | null;
  name: string | null;
  lastSignedInAt: Date | null;
  expiresAt: number;
};

@Injectable()
export class IdentityProvisioner {
  private readonly actorCache = new Map<string, CachedActor>();

  constructor(private readonly prisma: PrismaService) {}

  async resolve(input: IdentityProvisioningInput): Promise<Actor> {
    const cached = this.freshCacheEntry(input);
    if (cached) return cached.actor;
    return this.resolveFromDatabase(input);
  }

  private freshCacheEntry(input: IdentityProvisioningInput): CachedActor | undefined {
    const key = cacheKey(input);
    const entry = this.actorCache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.actorCache.delete(key);
      return undefined;
    }
    if (hasClaimChanges(entry, input) || signInRefreshDue(entry.lastSignedInAt)) return undefined;
    return entry;
  }

  private async resolveFromDatabase(input: IdentityProvisioningInput): Promise<Actor> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: input.tenantSlug },
      select: { id: true },
    });
    if (!tenant) return this.rememberCreated(input, await this.createTenantAndUser(input));

    const user = await this.findUser(tenant.id, input.subject);
    if (!user) return this.rememberCreated(input, await this.createUser(tenant.id, input));

    if (user.status === 'disabled') throw accountDisabled();
    return this.refreshExistingUser(user, input);
  }

  private async refreshExistingUser(
    user: StoredIdentity,
    input: IdentityProvisioningInput,
  ): Promise<Actor> {
    if (!hasClaimChanges(user, input) && !signInRefreshDue(user.lastSignedInAt)) {
      return this.remember(input, user, user.lastSignedInAt);
    }
    const signedInAt = new Date();
    const updated = await this.prisma.user.update({
      where: { tenantId_id: { tenantId: user.tenantId, id: user.id } },
      data: { ...changedUserData(user, input), lastSignedInAt: signedInAt },
      select: ACTOR_SELECT,
    });
    return this.remember(input, { ...updated, ...mergedClaims(user, input) }, signedInAt);
  }

  private remember(
    input: IdentityProvisioningInput,
    identity: Pick<StoredIdentity, 'id' | 'subject' | 'tenantId' | 'role' | 'email' | 'name'>,
    lastSignedInAt: Date | null,
  ): Actor {
    const actor = actorFor(identity);
    this.storeCacheEntry(input, {
      actor,
      email: identity.email,
      name: identity.name,
      lastSignedInAt,
    });
    return actor;
  }

  private rememberCreated(input: IdentityProvisioningInput, actor: Actor): Actor {
    this.storeCacheEntry(input, {
      actor,
      email: input.email ?? null,
      name: input.name ?? null,
      lastSignedInAt: new Date(),
    });
    return actor;
  }

  private storeCacheEntry(
    input: IdentityProvisioningInput,
    entry: Omit<CachedActor, 'expiresAt'>,
  ): void {
    if (this.actorCache.size >= ACTOR_CACHE_MAX_ENTRIES) this.pruneCache();
    this.actorCache.set(cacheKey(input), {
      ...entry,
      expiresAt: Date.now() + ACTOR_CACHE_TTL_MS,
    });
  }

  private pruneCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.actorCache) {
      if (entry.expiresAt <= now) this.actorCache.delete(key);
    }
    if (this.actorCache.size < ACTOR_CACHE_MAX_ENTRIES) return;
    const oldest = this.actorCache.keys().next().value;
    if (oldest !== undefined) this.actorCache.delete(oldest);
  }

  private findUser(tenantId: string, subject: string) {
    return this.prisma.user.findUnique({
      where: { tenantId_subject: { tenantId, subject } },
      select: IDENTITY_SELECT,
    });
  }

  private async createTenantAndUser(input: IdentityProvisioningInput): Promise<Actor> {
    return runSerializable(this.prisma, async (transaction) => {
      const tenant = await transaction.tenant.upsert({
        where: { slug: input.tenantSlug },
        create: { slug: input.tenantSlug, name: input.tenantSlug },
        update: {},
        select: { id: true },
      });
      return this.upsertUser(transaction, tenant.id, input);
    });
  }

  private async createUser(tenantId: string, input: IdentityProvisioningInput): Promise<Actor> {
    return runSerializable(this.prisma, (transaction) =>
      this.upsertUser(transaction, tenantId, input),
    );
  }

  private async upsertUser(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    input: IdentityProvisioningInput,
  ): Promise<Actor> {
    const user = await transaction.user.upsert({
      where: { tenantId_subject: { tenantId, subject: input.subject } },
      create: userCreateData(tenantId, input),
      update: userInputData(input),
      select: ACTOR_SELECT,
    });
    return actorFor(user);
  }
}

function cacheKey(input: IdentityProvisioningInput) {
  return `${input.tenantSlug}\u0000${input.subject}`;
}

function signInRefreshDue(lastSignedInAt: Date | null): boolean {
  if (!lastSignedInAt) return true;
  return Date.now() - lastSignedInAt.getTime() >= SIGN_IN_REFRESH_INTERVAL_MS;
}

function hasClaimChanges(
  current: { email: string | null; name: string | null },
  input: IdentityProvisioningInput,
): boolean {
  return (
    (input.email !== undefined && input.email !== current.email) ||
    (input.name !== undefined && input.name !== current.name)
  );
}

function mergedClaims(user: StoredIdentity, input: IdentityProvisioningInput) {
  return {
    email: input.email === undefined ? user.email : input.email,
    name: input.name === undefined ? user.name : input.name,
  };
}

function userCreateData(tenantId: string, input: IdentityProvisioningInput) {
  return {
    tenantId,
    subject: input.subject,
    role: input.role,
    email: input.email ?? null,
    name: input.name ?? null,
    lastSignedInAt: new Date(),
  };
}

function userInputData(input: IdentityProvisioningInput) {
  return {
    ...(input.email === undefined ? {} : { email: input.email }),
    ...(input.name === undefined ? {} : { name: input.name }),
    lastSignedInAt: new Date(),
  };
}

function changedUserData(user: StoredIdentity, input: IdentityProvisioningInput) {
  return {
    ...(input.email === undefined || user.email === input.email ? {} : { email: input.email }),
    ...(input.name === undefined || user.name === input.name ? {} : { name: input.name }),
  };
}

function actorFor(user: Pick<StoredIdentity, 'id' | 'subject' | 'tenantId' | 'role'>): Actor {
  return actorFromIdentity({ ...user, role: user.role as Role });
}

function accountDisabled() {
  return new ForbiddenException({
    code: 'ACCOUNT_DISABLED',
    message: '该账号已被停用。',
  });
}
