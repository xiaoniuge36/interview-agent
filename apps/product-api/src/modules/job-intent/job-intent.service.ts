import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  JobIntentListSchema,
  JobIntentPayloadSchema,
  JobIntentSchema,
  JobProfileSchema,
  type CreateJobIntentInput,
  type JobIntent,
  type JobIntentPayload,
  type JobProfile,
} from '@interview-agent/contracts';
import { AuditService, jsonValue } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { jobIntentGuidance } from './job-intent-guidance';

@Injectable()
export class JobIntentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async list(context: ProductRequestContext): Promise<JobIntentPayload[]> {
    this.assertAccess(context, 'job_intent:read');
    const intents = await this.prisma.jobIntent.findMany({
      where: { tenantId: context.tenantId, userId: context.actor.id },
      include: { profile: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return JobIntentListSchema.parse(
      intents.map((record) => ({
        intent: mapIntent(record),
        profile: record.profile ? mapProfile(record.profile) : null,
      })),
    );
  }

  async get(context: ProductRequestContext, id: string): Promise<JobIntentPayload> {
    const record = await this.prisma.jobIntent.findFirst({
      where: { id, tenantId: context.tenantId },
      include: { profile: true },
    });
    if (!record) throw new NotFoundException('JobIntent not found');
    this.policy.assert(context.actor, 'job_intent:read', {
      tenantId: record.tenantId,
      ownerId: record.userId,
    });
    return JobIntentPayloadSchema.parse({
      intent: mapIntent(record),
      profile: record.profile ? mapProfile(record.profile) : null,
    });
  }

  async create(
    context: ProductRequestContext,
    input: CreateJobIntentInput,
  ): Promise<JobIntentPayload> {
    this.assertAccess(context, 'job_intent:write');
    return this.prisma.$transaction(
      async (transaction) => {
        const intent = await transaction.jobIntent.create({
          data: {
            tenantId: context.tenantId,
            userId: context.actor.id,
            targetRole: input.targetRole,
            jdText: input.jdText,
            companyContext: input.companyContext || null,
            communicationText: input.communicationText || null,
            status: 'ready',
          },
        });
        const analysis = jobIntentGuidance(mapIntent(intent));
        const profile = await transaction.jobProfile.create({
          data: {
            tenantId: context.tenantId,
            jobIntentId: intent.id,
            skillWeights: jsonValue(analysis.skillWeights),
            interviewFocus: analysis.interviewFocus,
            riskSignals: analysis.riskSignals,
            prepAdvice: analysis.prepAdvice,
          },
        });
        await this.audit.record(
          context,
          {
            action: 'job_intent.create',
            resourceType: 'JobIntent',
            resourceId: intent.id,
            metadata: { targetRole: input.targetRole },
          },
          transaction,
        );
        return JobIntentPayloadSchema.parse({
          intent: mapIntent(intent),
          profile: mapProfile(profile),
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private assertAccess(
    context: ProductRequestContext,
    action: 'job_intent:read' | 'job_intent:write',
  ) {
    this.policy.assert(context.actor, action, {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
  }
}

function mapIntent(record: {
  id: string;
  tenantId: string;
  userId: string;
  targetRole: string;
  jdText: string;
  companyContext: string | null;
  communicationText: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): JobIntent {
  return JobIntentSchema.parse({
    ...record,
    companyContext: record.companyContext ?? undefined,
    communicationText: record.communicationText ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

function mapProfile(record: {
  id: string;
  tenantId: string;
  jobIntentId: string;
  skillWeights: Prisma.JsonValue;
  interviewFocus: string[];
  riskSignals: string[];
  prepAdvice: string[];
  createdAt: Date;
}): JobProfile {
  return JobProfileSchema.parse({ ...record, createdAt: record.createdAt.toISOString() });
}
