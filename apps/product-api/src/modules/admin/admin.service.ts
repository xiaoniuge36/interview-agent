import { Injectable } from '@nestjs/common';
import {
  AgentRunListSchema,
  AgentRunViewSchema,
  AuditLogListSchema,
  AuditLogViewSchema,
  CandidateReviewListSchema,
  CandidateReviewSchema,
  DashboardSchema,
  ModelProfileListSchema,
  ModelProfileSchema,
  QuestionListSchema,
  QuestionSchema,
  type AgentRunView,
  type AuditLogView,
  type Dashboard,
} from '@interview-agent/contracts';
import { AuditService } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';

const ACTIVE_INTERVIEW_STATUSES = ['created', 'running', 'waiting_user'] as const;
const PIPELINE_STAGES = ['received', 'processing', 'review', 'published', 'failed'] as const;
const DASHBOARD_RECENT_RUN_LIMIT = 4;
const PERCENT_SCALE = 100;
const DEFAULT_LIST_LIMIT = 500;
const MODEL_PROFILE_LIMIT = 200;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async dashboard(context: ProductRequestContext): Promise<Dashboard> {
    this.assertTenantPermission(context, 'question:read');
    const [published, pending, active, reports, pipeline, recentRuns, valid, checked, latency] =
      await Promise.all([
        this.prisma.question.count({ where: this.questionScope(context, 'published') }),
        this.prisma.candidateQuestion.count({
          where: { tenantId: context.tenantId, status: 'pending' },
        }),
        this.prisma.interviewSession.count({
          where: { tenantId: context.tenantId, status: { in: [...ACTIVE_INTERVIEW_STATUSES] } },
        }),
        this.prisma.interviewReport.count({ where: { tenantId: context.tenantId } }),
        this.prisma.knowledgeAsset.groupBy({
          by: ['status'],
          where: { tenantId: context.tenantId },
          _count: { _all: true },
        }),
        this.loadAgentRuns(context, DASHBOARD_RECENT_RUN_LIMIT),
        this.prisma.agentRun.count({ where: { tenantId: context.tenantId, schemaValid: true } }),
        this.prisma.agentRun.count({
          where: { tenantId: context.tenantId, schemaValid: { not: null } },
        }),
        this.prisma.agentRun.aggregate({
          where: { tenantId: context.tenantId, latencyMs: { not: null } },
          _avg: { latencyMs: true },
        }),
      ]);
    return DashboardSchema.parse({
      stats: {
        publishedQuestions: published,
        pendingCandidates: pending,
        activeInterviews: active,
        reportsReady: reports,
        schemaPassRate:
          checked === 0 ? PERCENT_SCALE : Number(((valid / checked) * PERCENT_SCALE).toFixed(1)),
        avgLatencyMs: latency._avg.latencyMs ?? 0,
      },
      importPipeline: PIPELINE_STAGES.map((stage) => ({
        stage,
        count: pipeline.find((item) => item.status === stage)?._count._all ?? 0,
      })),
      recentRuns,
    });
  }

  async questions(context: ProductRequestContext) {
    this.assertTenantPermission(context, 'question:read');
    const records = await this.prisma.question.findMany({
      where: this.questionScope(context),
      orderBy: { updatedAt: 'desc' },
      take: DEFAULT_LIST_LIMIT,
    });
    return QuestionListSchema.parse(records.map((record) => QuestionSchema.parse(record)));
  }

  async candidates(context: ProductRequestContext) {
    this.assertTenantPermission(context, 'candidate:review');
    const records = await this.prisma.candidateQuestion.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { createdAt: 'desc' },
      take: DEFAULT_LIST_LIMIT,
    });
    return CandidateReviewListSchema.parse(
      records.map((record) =>
        CandidateReviewSchema.parse({
          ...record,
          createdAt: record.createdAt.toISOString(),
        }),
      ),
    );
  }

  async modelProfiles(context: ProductRequestContext) {
    this.assertTenantPermission(context, 'model:manage');
    const records = await this.prisma.modelProfile.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { updatedAt: 'desc' },
      take: MODEL_PROFILE_LIMIT,
    });
    return ModelProfileListSchema.parse(
      records.map((record) =>
        ModelProfileSchema.parse({
          ...record,
          updatedAt: record.updatedAt.toISOString(),
        }),
      ),
    );
  }

  async agentRuns(context: ProductRequestContext) {
    this.assertTenantPermission(context, 'audit:read');
    return AgentRunListSchema.parse(await this.loadAgentRuns(context, DEFAULT_LIST_LIMIT));
  }

  async auditLogs(context: ProductRequestContext) {
    this.assertTenantPermission(context, 'audit:read');
    const records = await this.audit.list(context, DEFAULT_LIST_LIMIT);
    return AuditLogListSchema.parse(records.map(mapAuditLog));
  }

  private async loadAgentRuns(
    context: ProductRequestContext,
    limit: number,
  ): Promise<AgentRunView[]> {
    const records = await this.prisma.agentRun.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    return records.map((record) =>
      AgentRunViewSchema.parse({
        ...record,
        updatedAt: record.updatedAt.toISOString(),
      }),
    );
  }

  private questionScope(context: ProductRequestContext, status?: 'published') {
    return {
      OR: [{ tenantId: context.tenantId }, { visibility: 'public' as const }],
      ...(status ? { status } : {}),
    };
  }

  private assertTenantPermission(
    context: ProductRequestContext,
    action: 'question:read' | 'candidate:review' | 'model:manage' | 'audit:read',
  ) {
    this.policy.assert(context.actor, action, { tenantId: context.tenantId });
  }
}

function mapAuditLog(record: {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorId: string;
  actorRole: string;
  traceId: string;
  result: string;
  createdAt: Date;
}): AuditLogView {
  return AuditLogViewSchema.parse({
    ...record,
    createdAt: record.createdAt.toISOString(),
  });
}
