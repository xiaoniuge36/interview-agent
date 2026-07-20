import type {
  AiInvocationOperation,
  AiInvocationStatus,
  AiUsageFailureBreakdown,
  AiUsageModelBreakdown,
  AiUsageOperationBreakdown,
  AiUsagePeriod,
  AiUsageTotals,
  AiUsageTrendPoint,
  AiInvocationView,
  ModelProvider,
} from '@interview-agent/contracts';
import type { PrismaService } from '../../common/database/prisma.service';
import {
  failureBreakdown,
  modelBreakdown,
  operationBreakdown,
  statusCounts,
  trendMetrics,
} from './ai-usage-aggregation';

const PERCENT_SCALE = 100;
const SEVEN_DAY_OFFSET = 6;
const THIRTY_DAY_OFFSET = 29;
const RECENT_INVOCATION_LIMIT = 10;

export type AiUsageTimeRange = { startAt: Date; endAt: Date };
export type AiUsageFilter = {
  tenantId?: string;
  userId?: string;
  provider?: ModelProvider;
  operation?: AiInvocationOperation;
};

type InvocationWhere = AiUsageFilter & { createdAt: { gte: Date; lt: Date }; status?: string };
export type GroupRow = Record<string, unknown> & {
  _count: { _all: number };
  _sum: { totalTokens: number | null };
};
export type InvocationRow = {
  id: string;
  operation: AiInvocationOperation;
  provider: ModelProvider;
  model: string;
  status: AiInvocationStatus;
  latencyMs: number | null;
  totalTokens: number | null;
  errorCode: string | null;
  createdAt: Date;
};

type AnalyticsStore = {
  aggregate: (
    args: unknown,
  ) => Promise<{ _avg: { latencyMs: number | null }; _sum: { totalTokens: number | null } }>;
  groupBy: (args: unknown) => Promise<unknown[]>;
  findMany: (args: unknown) => Promise<InvocationRow[]>;
};

type AggregatedRows = {
  statusGroups: unknown[];
  aggregate: { _avg: { latencyMs: number | null }; _sum: { totalTokens: number | null } };
  modelGroups: unknown[];
  operationGroups: unknown[];
  operationLatency: unknown[];
  failureGroups: unknown[];
};

type RecentRows = {
  recent: InvocationRow[];
  recentFailures: InvocationRow[];
  trendRows: InvocationRow[];
};

export type AiUsageMetrics = {
  totals: AiUsageTotals;
  byModel: AiUsageModelBreakdown[];
  byOperation: AiUsageOperationBreakdown[];
  failures: AiUsageFailureBreakdown[];
  recent: AiInvocationView[];
  recentFailures: AiInvocationView[];
  trend: AiUsageTrendPoint[];
};

export async function loadAiUsageMetrics(
  prisma: PrismaService,
  input: { period: AiUsagePeriod; filters: AiUsageFilter; now?: Date },
): Promise<{ range: AiUsageTimeRange; metrics: AiUsageMetrics }> {
  const range = aiUsageRange(input.period, input.now ?? new Date());
  const where = invocationWhere(input.filters, range);
  const store = analyticsStore(prisma);
  const [groups, records] = await Promise.all([
    aggregatedRows(store, where),
    recentRows(store, where),
  ]);
  return {
    range,
    metrics: {
      totals: totals(groups.statusGroups as GroupRow[], groups.aggregate),
      byModel: modelBreakdown(groups.modelGroups as GroupRow[]),
      byOperation: operationBreakdown(
        groups.operationGroups as GroupRow[],
        groups.operationLatency as GroupRow[],
      ),
      failures: failureBreakdown(groups.failureGroups as GroupRow[]),
      recent: records.recent.map(toInvocationView),
      recentFailures: records.recentFailures.map(toInvocationView),
      trend: trendMetrics(range, records.trendRows),
    },
  };
}

async function aggregatedRows(
  store: AnalyticsStore,
  where: InvocationWhere,
): Promise<AggregatedRows> {
  const [statusGroups, aggregate, modelGroups, operationGroups, operationLatency, failureGroups] =
    await Promise.all([
      store.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { totalTokens: true } }),
      store.aggregate({ where, _avg: { latencyMs: true }, _sum: { totalTokens: true } }),
      store.groupBy({
        by: ['provider', 'model', 'status'],
        where,
        _count: { _all: true },
        _sum: { totalTokens: true },
      }),
      store.groupBy({
        by: ['operation', 'status'],
        where,
        _count: { _all: true },
        _sum: { totalTokens: true },
      }),
      store.groupBy({ by: ['operation'], where, _avg: { latencyMs: true } }),
      store.groupBy({ by: ['errorCode'], where: failedWhere(where), _count: { _all: true } }),
    ]);
  return { statusGroups, aggregate, modelGroups, operationGroups, operationLatency, failureGroups };
}

async function recentRows(store: AnalyticsStore, where: InvocationWhere): Promise<RecentRows> {
  const [recent, recentFailures, trendRows] = await Promise.all([
    store.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: RECENT_INVOCATION_LIMIT,
    }),
    store.findMany({
      where: { ...where, status: 'failed' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: RECENT_INVOCATION_LIMIT,
    }),
    store.findMany({ where, select: { createdAt: true, status: true, totalTokens: true } }),
  ]);
  return { recent, recentFailures, trendRows };
}

function failedWhere(where: InvocationWhere) {
  return { ...where, status: 'failed', errorCode: { not: null } };
}

export function aiUsageRange(period: AiUsagePeriod, now: Date): AiUsageTimeRange {
  const endAt = new Date(now);
  const startAt = startOfUtcDay(endAt);
  if (period !== 'today') {
    startAt.setUTCDate(
      startAt.getUTCDate() - (period === '7d' ? SEVEN_DAY_OFFSET : THIRTY_DAY_OFFSET),
    );
  }
  return { startAt, endAt };
}

function invocationWhere(filters: AiUsageFilter, range: AiUsageTimeRange): InvocationWhere {
  return { ...filters, createdAt: { gte: range.startAt, lt: range.endAt } };
}

function totals(
  groups: GroupRow[],
  aggregate: { _avg: { latencyMs: number | null }; _sum: { totalTokens: number | null } },
): AiUsageTotals {
  const counts = statusCounts(groups);
  const totalTokens = aggregate._sum.totalTokens;
  return {
    ...counts,
    successRate: percentage(counts.succeeded, counts.invocations),
    averageLatencyMs: Math.round(aggregate._avg.latencyMs ?? 0),
    totalTokens,
    usageAvailable: totalTokens !== null,
  };
}

function toInvocationView(row: InvocationRow): AiInvocationView {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

function analyticsStore(prisma: PrismaService): AnalyticsStore {
  return (prisma as unknown as { aiInvocation: AnalyticsStore }).aiInvocation;
}

function percentage(value: number, total: number): number {
  return total === 0 ? 0 : Number(((value / total) * PERCENT_SCALE).toFixed(2));
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
