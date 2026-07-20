import { Injectable } from '@nestjs/common';
import {
  AiUsageSummarySchema,
  type AiUsageSummary,
  type AiUsageSummaryQuery,
} from '@interview-agent/contracts';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { loadAiUsageMetrics } from './ai-usage-metrics';

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
    this.policy.assert(context.actor, 'model_credential:read', {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
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
}
