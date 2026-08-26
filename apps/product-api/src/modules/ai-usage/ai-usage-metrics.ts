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
import { Prisma } from '@prisma/client';
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
export type TrendAggregateRow = {
  day: Date;
  invocations: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  totalTokens: number | null;
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
};

export type AiUsageMetrics = {
  totals: AiUsageTotals;
  byModel: AiUsageModelBreakdown[];
  byOperation: AiUsageOperationBreakdown[];
  failures: AiUsageFailureBreakdown[];
  recent: AiInvocationView[];
  recentFailures: AiInvocationView[];
  trend: AiUsageTrendPoint[];
  guardrailFailures: { budgetRejected: number; circuitRejected: number };
};

export async function loadAiUsageMetrics(
  prisma: PrismaService,
  input: { period: AiUsagePeriod; filters: AiUsageFilter; now?: Date },
): Promise<{ range: AiUsageTimeRange; metrics: AiUsageMetrics }> {
  const range = aiUsageRange(input.period, input.now ?? new Date());
  const where = invocationWhere(input.filters, range);
  const store = analyticsStore(prisma);
  const [groups, records, trendRows] = await Promise.all([
    aggregatedRows(store, where),
    recentRows(store, where),
    trendAggregateRows(prisma, where),
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
      trend: trendMetrics(range, trendRows),
      guardrailFailures: guardrailFailures(groups.failureGroups as GroupRow[]),
    },
  };
}

function guardrailFailures(rows: GroupRow[]) {
  return {
    budgetRejected: failureCount(rows, 'AI_BUDGET_EXHAUSTED'),
    circuitRejected: failureCount(rows, 'AI_CIRCUIT_OPEN'),
  };
}

function failureCount(rows: GroupRow[], code: string) {
  const row = rows.find((item) => item.errorCode === code);
  return row?._count._all ?? 0;
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
  const [recent, recentFailures] = await Promise.all([
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
  ]);
  return { recent, recentFailures };
}

function trendAggregateRows(
  prisma: PrismaService,
  where: InvocationWhere,
): Promise<TrendAggregateRow[]> {
  return prisma.$queryRaw<TrendAggregateRow[]>(Prisma.sql`
    SELECT
      date_trunc('day', "createdAt") AS day,
      COUNT(*)::int AS invocations,
      COUNT(*) FILTER (WHERE "status" = 'succeeded')::int AS succeeded,
      COUNT(*) FILTER (WHERE "status" = 'failed')::int AS failed,
      COUNT(*) FILTER (WHERE "status" = 'cancelled')::int AS cancelled,
      SUM("totalTokens")::int AS "totalTokens"
    FROM "AiInvocation"
    WHERE "createdAt" >= ${where.createdAt.gte} AND "createdAt" < ${where.createdAt.lt}
    ${trendFilterConditions(where)}
    GROUP BY 1
  `);
}

function trendFilterConditions(where: InvocationWhere): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];
  if (where.tenantId) conditions.push(Prisma.sql`AND "tenantId" = ${where.tenantId}`);
  if (where.userId) conditions.push(Prisma.sql`AND "userId" = ${where.userId}`);
  if (where.provider) conditions.push(Prisma.sql`AND "provider" = ${where.provider}`);
  if (where.operation) {
    conditions.push(Prisma.sql`AND "operation" = ${where.operation}::"AiInvocationOperation"`);
  }
  return conditions.length > 0 ? Prisma.join(conditions, ' ') : Prisma.empty;
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
