import type {
  AiInvocationOperation,
  AiInvocationStatus,
  AiUsageFailureBreakdown,
  AiUsageModelBreakdown,
  AiUsageOperationBreakdown,
  AiUsageTrendPoint,
  ModelProvider,
} from '@interview-agent/contracts';
import type { AiUsageTimeRange, GroupRow, InvocationRow } from './ai-usage-metrics';

const ISO_DATE_LENGTH = 10;
const MODEL_BREAKDOWN_LIMIT = 20;
const FAILURE_BREAKDOWN_LIMIT = 10;

export function modelBreakdown(groups: GroupRow[]): AiUsageModelBreakdown[] {
  const buckets = new Map<string, AiUsageModelBreakdown>();
  for (const group of groups) addModelGroup(buckets, group);
  return [...buckets.values()].sort(compareInvocations).slice(0, MODEL_BREAKDOWN_LIMIT);
}

export function operationBreakdown(
  groups: GroupRow[],
  latency: GroupRow[],
): AiUsageOperationBreakdown[] {
  const buckets = new Map<AiInvocationOperation, AiUsageOperationBreakdown>();
  for (const group of groups) addOperationGroup(buckets, group);
  for (const group of latency) {
    const current = buckets.get(group.operation as AiInvocationOperation);
    if (current) current.averageLatencyMs = Math.round(avgLatency(group));
  }
  return [...buckets.values()].sort(compareInvocations);
}

export function failureBreakdown(groups: GroupRow[]): AiUsageFailureBreakdown[] {
  return groups
    .filter((group) => typeof group.errorCode === 'string')
    .map((group) => ({ errorCode: group.errorCode as string, count: group._count._all }))
    .sort(
      (left, right) => right.count - left.count || left.errorCode.localeCompare(right.errorCode),
    )
    .slice(0, FAILURE_BREAKDOWN_LIMIT);
}

export function trendMetrics(range: AiUsageTimeRange, rows: InvocationRow[]): AiUsageTrendPoint[] {
  const buckets = trendBuckets(range);
  for (const row of rows) addTrendRow(buckets, row);
  return [...buckets.values()];
}

export function statusCounts(groups: GroupRow[]) {
  const counts = { invocations: 0, succeeded: 0, failed: 0, cancelled: 0 };
  for (const group of groups)
    addStatus(counts, group.status as AiInvocationStatus, group._count._all);
  return counts;
}

function addModelGroup(buckets: Map<string, AiUsageModelBreakdown>, group: GroupRow): void {
  const provider = group.provider as ModelProvider;
  const model = group.model as string;
  const key = `${provider}:${model}`;
  const current = buckets.get(key) ?? emptyModel(provider, model);
  addStatus(current, group.status as AiInvocationStatus, group._count._all);
  current.totalTokens = addTokens(current.totalTokens, group._sum.totalTokens);
  buckets.set(key, current);
}

function addOperationGroup(
  buckets: Map<AiInvocationOperation, AiUsageOperationBreakdown>,
  group: GroupRow,
): void {
  const operation = group.operation as AiInvocationOperation;
  const current = buckets.get(operation) ?? emptyOperation(operation);
  addStatus(current, group.status as AiInvocationStatus, group._count._all);
  current.totalTokens = addTokens(current.totalTokens, group._sum.totalTokens);
  buckets.set(operation, current);
}

function addTrendRow(buckets: Map<string, AiUsageTrendPoint>, row: InvocationRow): void {
  const bucket = buckets.get(utcDate(row.createdAt));
  if (!bucket) return;
  bucket.invocations += 1;
  incrementTrendStatus(bucket, row.status);
  bucket.totalTokens = addTokens(bucket.totalTokens, row.totalTokens);
}

function incrementTrendStatus(bucket: AiUsageTrendPoint, status: AiInvocationStatus): void {
  if (status === 'succeeded') bucket.succeeded += 1;
  if (status === 'failed') bucket.failed += 1;
  if (status === 'cancelled') bucket.cancelled += 1;
}

function addStatus(
  target: { invocations: number; succeeded: number; failed: number; cancelled: number },
  status: AiInvocationStatus,
  count: number,
): void {
  target.invocations += count;
  target[status] += count;
}

function emptyModel(provider: ModelProvider, model: string): AiUsageModelBreakdown {
  return {
    provider,
    model,
    invocations: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0,
    totalTokens: null,
  };
}

function emptyOperation(operation: AiInvocationOperation): AiUsageOperationBreakdown {
  return {
    operation,
    invocations: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0,
    averageLatencyMs: 0,
    totalTokens: null,
  };
}

function trendBuckets(range: AiUsageTimeRange): Map<string, AiUsageTrendPoint> {
  const buckets = new Map<string, AiUsageTrendPoint>();
  const cursor = startOfUtcDay(range.startAt);
  const end = startOfUtcDay(range.endAt);
  while (cursor <= end) {
    const date = utcDate(cursor);
    buckets.set(date, {
      date,
      invocations: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      totalTokens: null,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return buckets;
}

function avgLatency(group: GroupRow): number {
  const average = (group._avg as { latencyMs?: number | null } | undefined)?.latencyMs;
  return average ?? 0;
}

function addTokens(current: number | null, next: number | null): number | null {
  if (current === null && next === null) return null;
  return (current ?? 0) + (next ?? 0);
}

function compareInvocations<T extends { invocations: number }>(left: T, right: T): number {
  return right.invocations - left.invocations;
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function utcDate(value: Date): string {
  return value.toISOString().slice(0, ISO_DATE_LENGTH);
}
