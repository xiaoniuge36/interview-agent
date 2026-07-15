import { Injectable } from '@nestjs/common';
import type { Actor, Role } from '@interview-agent/contracts';
import type { Prisma } from '@prisma/client';
import { actorFromIdentity } from '../context/request-context';
import { PrismaService } from '../database/prisma.service';
import { runSerializable } from '../database/serializable-transaction';

const ACTOR_SELECT = { id: true, subject: true, role: true, tenantId: true } as const;
const IDENTITY_SELECT = { ...ACTOR_SELECT, email: true, name: true } as const;

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
};

@Injectable()
export class IdentityProvisioner {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(input: IdentityProvisioningInput): Promise<Actor> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: input.tenantSlug },
      select: { id: true },
    });
    if (!tenant) return this.createTenantAndUser(input);

    const user = await this.findUser(tenant.id, input.subject);
    if (!user) return this.createUser(tenant.id, input);

    const changes = changedUserData(user, input);
    if (!Object.keys(changes).length) return actorFor(user);
    const updated = await this.prisma.user.update({
      where: { tenantId_id: { tenantId: user.tenantId, id: user.id } },
      data: changes,
      select: ACTOR_SELECT,
    });
    return actorFor(updated);
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

function userCreateData(tenantId: string, input: IdentityProvisioningInput) {
  return {
    tenantId,
    subject: input.subject,
    role: input.role,
    email: input.email ?? null,
    name: input.name ?? null,
  };
}

function userInputData(input: IdentityProvisioningInput) {
  return {
    role: input.role,
    ...(input.email === undefined ? {} : { email: input.email }),
    ...(input.name === undefined ? {} : { name: input.name }),
  };
}

function changedUserData(user: StoredIdentity, input: IdentityProvisioningInput) {
  return {
    ...(user.role === input.role ? {} : { role: input.role }),
    ...(input.email === undefined || user.email === input.email ? {} : { email: input.email }),
    ...(input.name === undefined || user.name === input.name ? {} : { name: input.name }),
  };
}

function actorFor(user: Pick<StoredIdentity, 'id' | 'subject' | 'tenantId' | 'role'>): Actor {
  return actorFromIdentity({ ...user, role: user.role as Role });
}
