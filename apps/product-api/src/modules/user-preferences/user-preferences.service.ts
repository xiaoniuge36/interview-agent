import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  UserPreferencePayloadSchema,
  UserPreferenceSchema,
  type UpsertUserPreferenceInput,
  type UserPreference,
  type UserPreferencePayload,
} from '@interview-agent/contracts';
import { AuditService } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class UserPreferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async get(context: ProductRequestContext): Promise<UserPreferencePayload> {
    this.assertAccess(context, 'preferences:read');
    const preference = await this.prisma.userPreference.findUnique({
      where: { tenantId_userId: ownerKey(context) },
    });
    return UserPreferencePayloadSchema.parse({
      preferences: preference ? mapPreference(preference) : null,
    });
  }

  async upsert(
    context: ProductRequestContext,
    input: UpsertUserPreferenceInput,
  ): Promise<UserPreferencePayload> {
    this.assertAccess(context, 'preferences:write');
    return this.prisma.$transaction(async (transaction) => {
      const preference = await transaction.userPreference.upsert({
        where: { tenantId_userId: ownerKey(context) },
        create: { tenantId: context.tenantId, userId: context.actor.id, ...input },
        update: input,
      });
      await this.audit.record(
        context,
        {
          action: 'preferences.upsert',
          resourceType: 'UserPreference',
          resourceId: preference.id,
          metadata: { theme: preference.theme, motion: preference.motion },
        },
        transaction,
      );
      return UserPreferencePayloadSchema.parse({ preferences: mapPreference(preference) });
    }, transactionOptions());
  }

  private assertAccess(
    context: ProductRequestContext,
    action: 'preferences:read' | 'preferences:write',
  ) {
    this.policy.assert(context.actor, action, {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
  }
}

function ownerKey(context: ProductRequestContext) {
  return { tenantId: context.tenantId, userId: context.actor.id };
}

function mapPreference(preference: {
  id: string;
  tenantId: string;
  userId: string;
  theme: string;
  motion: boolean;
  updatedAt: Date;
}): UserPreference {
  return UserPreferenceSchema.parse({
    id: preference.id,
    tenantId: preference.tenantId,
    userId: preference.userId,
    theme: preference.theme,
    motion: preference.motion,
    updatedAt: preference.updatedAt.toISOString(),
  });
}

function transactionOptions() {
  return { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const;
}
