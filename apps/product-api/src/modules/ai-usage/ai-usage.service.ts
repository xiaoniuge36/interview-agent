import { Injectable } from '@nestjs/common';
import {
  AiInvocationPageSchema,
  AiUsageSummarySchema,
  type AiInvocationPage,
  type AiInvocationPageQuery,
  type AiUsageSummary,
  type AiUsageSummaryQuery,
} from '@interview-agent/contracts';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { aiUsageRange, loadAiUsageMetrics, toInvocationView } from './ai-usage-metrics';

@Injectable()
export class AiUsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async summary(
    context: ProductRequestContext,
    query: AiUsageSummaryQuery,
  ): Promise<AiUsageSummary> {
    this.assertRead(context);
    const { range, metrics } = await loadAiUsageMetrics(this.prisma, {
      period: query.period,
      filters: { tenantId: context.tenantId, userId: context.actor.id },
    });
    return AiUsageSummarySchema.parse({
      period: query.period,
      range: { startAt: range.startAt.toISOString(), endAt: range.endAt.toISOString() },
      totals: metrics.totals,
      byModel: metrics.byModel,
      recent: metrics.recent,
    });
  }

  /** 调用明细按时间倒序分页，避免设置页把历史记录无限堆叠成一长列。 */
  async invocations(
    context: ProductRequestContext,
    query: AiInvocationPageQuery,
  ): Promise<AiInvocationPage> {
    this.assertRead(context);
    const range = aiUsageRange(query.period, new Date());
    const where = {
      tenantId: context.tenantId,
      userId: context.actor.id,
      createdAt: { gte: range.startAt, lt: range.endAt },
    };
    const [total, rows] = await Promise.all([
      this.prisma.aiInvocation.count({ where }),
      this.prisma.aiInvocation.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return AiInvocationPageSchema.parse({
      period: query.period,
      range: { startAt: range.startAt.toISOString(), endAt: range.endAt.toISOString() },
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: rows.map(toInvocationView),
    });
  }

  private assertRead(context: ProductRequestContext) {
    this.policy.assert(context.actor, 'model_credential:read', {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
  }
}
