import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  UserLearningProgressPayloadSchema,
  UserLearningProgressSchema,
  type UpsertLearningProgressInput,
  type UserLearningProgress,
  type UserLearningProgressPayload,
} from '@interview-agent/contracts';
import { AuditService } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class LearningProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async get(context: ProductRequestContext): Promise<UserLearningProgressPayload> {
    this.assertAccess(context, 'learning_progress:read');
    const progress = await this.prisma.userLearningProgress.findUnique({
      where: { tenantId_userId: ownerKey(context) },
    });
    return UserLearningProgressPayloadSchema.parse({
      progress: progress ? mapProgress(progress) : null,
    });
  }

  async upsert(
    context: ProductRequestContext,
    input: UpsertLearningProgressInput,
  ): Promise<UserLearningProgressPayload> {
    this.assertAccess(context, 'learning_progress:write');
    const data = {
      completedSlugs: input.completedSlugs,
      lastOpenedSlug: input.lastOpenedSlug,
      verificationByCourse: input.verificationByCourse as Prisma.InputJsonValue,
    };
    return this.prisma.$transaction(async (transaction) => {
      const progress = await transaction.userLearningProgress.upsert({
        where: { tenantId_userId: ownerKey(context) },
        create: { tenantId: context.tenantId, userId: context.actor.id, ...data },
        update: data,
      });
      await this.audit.record(
        context,
        {
          action: 'learning_progress.upsert',
          resourceType: 'UserLearningProgress',
          resourceId: progress.id,
          metadata: {
            completedCount: progress.completedSlugs.length,
            lastOpenedSlug: progress.lastOpenedSlug,
          },
        },
        transaction,
      );
      return UserLearningProgressPayloadSchema.parse({ progress: mapProgress(progress) });
    }, transactionOptions());
  }

  private assertAccess(
    context: ProductRequestContext,
    action: 'learning_progress:read' | 'learning_progress:write',
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

function mapProgress(progress: {
  id: string;
  tenantId: string;
  userId: string;
  completedSlugs: string[];
  lastOpenedSlug: string | null;
  verificationByCourse: Prisma.JsonValue;
  updatedAt: Date;
}): UserLearningProgress {
  return UserLearningProgressSchema.parse({
    id: progress.id,
    tenantId: progress.tenantId,
    userId: progress.userId,
    completedSlugs: progress.completedSlugs,
    lastOpenedSlug: progress.lastOpenedSlug,
    verificationByCourse: progress.verificationByCourse ?? {},
    updatedAt: progress.updatedAt.toISOString(),
  });
}

function transactionOptions() {
  return { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const;
}
