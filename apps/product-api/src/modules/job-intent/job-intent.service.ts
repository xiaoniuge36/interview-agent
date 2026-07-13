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

const SKILL_WEIGHTS = {
  agentStateMachine: { matched: 92, fallback: 76 },
  retrievalGovernance: { matched: 88, fallback: 70 },
  frontendEngineering: { matched: 84, fallback: 64 },
  observabilityEvaluation: { matched: 82, fallback: 68 },
} as const;

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
        const analysis = analyzeIntent(mapIntent(intent));
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

function analyzeIntent(intent: JobIntent): Omit<JobProfile, 'id' | 'createdAt'> {
  const text =
    `${intent.jdText}\n${intent.companyContext ?? ''}\n${intent.communicationText ?? ''}`.toLowerCase();
  const weights = [
    [
      'Agent 状态机',
      skillWeight(text, ['agent', 'langgraph'], SKILL_WEIGHTS.agentStateMachine),
      '岗位需要说明工作流与状态恢复。',
    ],
    [
      'RAG 与检索治理',
      skillWeight(text, ['rag', 'vector'], SKILL_WEIGHTS.retrievalGovernance),
      '重点关注检索质量、权限过滤和来源追踪。',
    ],
    [
      '前端产品工程',
      skillWeight(text, ['react', 'next'], SKILL_WEIGHTS.frontendEngineering),
      '需要把前端经验迁移到 AI 产品体验。',
    ],
    [
      '可观测与评估',
      skillWeight(text, ['observability', 'eval'], SKILL_WEIGHTS.observabilityEvaluation),
      '需要覆盖 trace、schema failure 和 golden case。',
    ],
  ] as const;
  return {
    tenantId: intent.tenantId,
    jobIntentId: intent.id,
    skillWeights: weights.map(([skill, weight, reason]) => ({ skill, weight, reason })),
    interviewFocus: [
      'Agent Runtime 边界',
      'Product API 事实源',
      'RAG 权限过滤',
      '模型输出结构化校验',
    ],
    riskSignals: ['不能解释业务状态与 Agent 状态分离时，容易被认为只是 prompt demo。'],
    prepAdvice: ['准备端到端链路图', '准备失败恢复案例', '准备模型输出 schema 示例'],
  };
}

function skillWeight(
  text: string,
  terms: string[],
  weights: { matched: number; fallback: number },
) {
  return hasAny(text, terms) ? weights.matched : weights.fallback;
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}
