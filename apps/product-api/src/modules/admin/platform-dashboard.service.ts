import { Injectable } from '@nestjs/common';
import {
  PlatformDashboardSchema,
  type PlatformDashboard,
  type PlatformDashboardQuery,
} from '@interview-agent/contracts';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { loadPlatformDashboardMetrics, type TimeRange } from './platform-dashboard.metrics';

const SEVEN_DAY_WINDOW = 7;
const THIRTY_DAY_WINDOW = 30;

@Injectable()
export class PlatformDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async dashboard(
    context: ProductRequestContext,
    query: PlatformDashboardQuery,
  ): Promise<PlatformDashboard> {
    this.policy.assert(context.actor, 'analytics:read', { platform: true });
    const range = dashboardRange(query.period, new Date());
    const metrics = await loadPlatformDashboardMetrics(this.prisma, range);

    return PlatformDashboardSchema.parse({
      period: query.period,
      range: { startAt: range.startAt.toISOString(), endAt: range.endAt.toISOString() },
      ...metrics,
    });
  }
}

function dashboardRange(period: PlatformDashboardQuery['period'], now: Date): TimeRange {
  const endAt = new Date(now);
  if (period === 'today') {
    const startAt = new Date(endAt);
    startAt.setUTCHours(0, 0, 0, 0);
    return { startAt, endAt };
  }
  const startAt = new Date(endAt);
  startAt.setUTCDate(
    startAt.getUTCDate() - (period === '7d' ? SEVEN_DAY_WINDOW : THIRTY_DAY_WINDOW),
  );
  return { startAt, endAt };
}
