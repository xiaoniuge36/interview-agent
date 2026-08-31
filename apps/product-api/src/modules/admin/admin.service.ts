import { Injectable } from '@nestjs/common';
import {
  AgentRunViewSchema,
  DashboardSchema,
  type AgentRunView,
  type Dashboard,
} from '@interview-agent/contracts';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';

const ACTIVE_INTERVIEW_STATUSES = ['created', 'running', 'waiting_user'] as const;
const PIPELINE_STAGES = ['received', 'processing', 'review', 'published', 'failed'] as const;
const DASHBOARD_RECENT_RUN_LIMIT = 4;
const PERCENT_SCALE = 100;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
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

  private assertTenantPermission(context: ProductRequestContext, action: 'question:read') {
    this.policy.assert(context.actor, action, { tenantId: context.tenantId });
  }
}
