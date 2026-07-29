import { Injectable } from '@nestjs/common';
import {
  PlatformAiAnalyticsSchema,
  type PlatformAiAnalytics,
  type PlatformAiAnalyticsQuery,
} from '@interview-agent/contracts';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { loadAiUsageMetrics } from './ai-usage-metrics';
import { AiCircuitBreaker } from './ai-circuit-breaker';
import { loadPlatformAiQuality } from './platform-ai-quality-metrics';

@Injectable()
export class PlatformAiAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly circuits: AiCircuitBreaker,
  ) {}

  async analytics(
    context: ProductRequestContext,
    query: PlatformAiAnalyticsQuery,
  ): Promise<PlatformAiAnalytics> {
    this.policy.assert(context.actor, 'analytics:read', { platform: true });
    const { range, metrics } = await loadAiUsageMetrics(this.prisma, {
      period: query.period,
      filters: {
        ...(query.provider ? { provider: query.provider } : {}),
        ...(query.operation ? { operation: query.operation } : {}),
      },
    });
    const quality = await loadPlatformAiQuality(
      this.prisma,
      range,
      metrics.guardrailFailures.budgetRejected,
    );
    return PlatformAiAnalyticsSchema.parse({
      period: query.period,
      range: { startAt: range.startAt.toISOString(), endAt: range.endAt.toISOString() },
      totals: metrics.totals,
      byModel: metrics.byModel,
      recent: metrics.recent,
      filters: { provider: query.provider ?? null, operation: query.operation ?? null },
      byOperation: metrics.byOperation,
      failures: metrics.failures,
      recentFailures: metrics.recentFailures,
      trend: metrics.trend,
      guardrails: { ...metrics.guardrailFailures, ...this.circuits.summary() },
      quality,
    });
  }
}
