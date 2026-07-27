import {
  AgentRunViewSchema,
  type PlatformAlert,
  type PlatformDashboard,
  type PlatformTrendPoint,
} from '@interview-agent/contracts';
import type { PrismaService } from '../../common/database/prisma.service';

const RECENT_FAILURE_LIMIT = 4;
const PERCENT_SCALE = 100;
const ISO_DATE_LENGTH = 10;
const PLATFORM_ADMIN_ROLES = ['platform_admin', 'admin', 'question_reviewer', 'support'] as const;
const HEALTHY_SUCCESS_RATE = 95;
const AGENT_USAGE_DEFINITIONS = [
  { agent: 'interview', operation: 'interview_next' },
  { agent: 'practice_evaluation', operation: 'practice_evaluation' },
  { agent: 'user_assistant', operation: 'user_page_agent' },
  { agent: 'admin_assistant', operation: 'admin_page_agent' },
] as const;

export type TimeRange = { startAt: Date; endAt: Date };

export async function loadPlatformDashboardMetrics(prisma: PrismaService, range: TimeRange) {
  const [accounts, content, training, runtime, trend, activeUsers, agentUsage] = await Promise.all([
    loadAccountMetrics(prisma, range),
    loadContentMetrics(prisma, range),
    loadTrainingMetrics(prisma, range),
    loadRuntimeMetrics(prisma, range),
    loadTrendMetrics(prisma, range),
    loadActiveUserCount(prisma, range),
    loadAgentUsageMetrics(prisma, range),
  ]);
  return {
    accounts,
    content,
    training,
    userUsage: {
      activeUsers,
      interviews: training.interviews,
      practiceSubmissions: training.practiceSubmissions,
      reports: training.reports + training.practiceReports,
    },
    agentUsage,
    runtime: runtime.dashboard,
    trend,
    funnel: {
      imports: content.imports,
      pendingCandidates: content.pendingCandidates,
      publishedQuestions: content.publishedQuestions,
      practiceSubmissions: training.practiceSubmissions,
      practiceReports: training.practiceReports,
    },
    alerts: buildAlerts(content, runtime.failureCount, runtime.dashboard),
  };
}

async function loadActiveUserCount(prisma: PrismaService, range: TimeRange) {
  return prisma.user.count({ where: { role: 'user', lastSignedInAt: rangeFilter(range) } });
}

async function loadAgentUsageMetrics(prisma: PrismaService, range: TimeRange) {
  const rows = await prisma.aiInvocation.groupBy({
    by: ['operation', 'status'],
    where: {
      createdAt: rangeFilter(range),
      operation: { in: AGENT_USAGE_DEFINITIONS.map(({ operation }) => operation) },
    },
    _count: { _all: true },
  });
  return AGENT_USAGE_DEFINITIONS.map(({ agent, operation }) => {
    const matchingRows = rows.filter((row) => row.operation === operation);
    const runs = matchingRows.reduce((total, row) => total + row._count._all, 0);
    const succeeded = matchingRows
      .filter((row) => row.status === 'succeeded')
      .reduce((total, row) => total + row._count._all, 0);
    return { agent, runs, succeeded, successRate: percentage(succeeded, runs) };
  });
}

async function loadAccountMetrics(prisma: PrismaService, range: TimeRange) {
  const createdAt = rangeFilter(range);
  const [total, created, active, disabled, tenants, admin, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt } }),
    prisma.user.count({ where: { lastSignedInAt: createdAt } }),
    prisma.user.count({ where: { status: 'disabled' } }),
    prisma.tenant.count(),
    prisma.user.count({ where: { role: { in: [...PLATFORM_ADMIN_ROLES] } } }),
    prisma.user.count({ where: { role: 'user' } }),
  ]);
  return { total, created, active, disabled, tenants, admin, users };
}

async function loadContentMetrics(prisma: PrismaService, range: TimeRange) {
  const createdAt = rangeFilter(range);
  const [imports, pendingCandidates, publishedQuestions, failedImports] = await Promise.all([
    prisma.importTask.count({ where: { createdAt } }),
    prisma.candidateQuestion.count({ where: { status: 'pending' } }),
    prisma.question.count({ where: { status: 'published' } }),
    prisma.importTask.count({ where: { status: 'failed', createdAt } }),
  ]);
  return { imports, pendingCandidates, publishedQuestions, failedImports };
}

async function loadTrainingMetrics(prisma: PrismaService, range: TimeRange) {
  const createdAt = rangeFilter(range);
  const [interviews, reports, practiceSubmissions, practiceReports] = await Promise.all([
    prisma.interviewSession.count({ where: { createdAt } }),
    prisma.interviewReport.count({ where: { createdAt } }),
    prisma.practiceSession.count({ where: { submittedAt: createdAt } }),
    prisma.practiceReport.count({ where: { createdAt } }),
  ]);
  return { interviews, reports, practiceSubmissions, practiceReports };
}

async function loadRuntimeMetrics(prisma: PrismaService, range: TimeRange) {
  const createdAt = rangeFilter(range);
  const [
    runs,
    successfulRuns,
    validSchemas,
    checkedSchemas,
    fallbacks,
    failedRuns,
    latency,
    failures,
  ] = await Promise.all([
    prisma.agentRun.count({ where: { createdAt } }),
    prisma.agentRun.count({ where: { createdAt, status: 'succeeded' } }),
    prisma.agentRun.count({ where: { createdAt, schemaValid: true } }),
    prisma.agentRun.count({ where: { createdAt, schemaValid: { not: null } } }),
    prisma.agentRun.count({ where: { createdAt, fallbackUsed: true } }),
    prisma.agentRun.count({ where: { createdAt, status: 'failed' } }),
    prisma.agentRun.aggregate({
      where: { createdAt, latencyMs: { not: null } },
      _avg: { latencyMs: true },
    }),
    prisma.agentRun.findMany({
      where: { createdAt, status: { in: ['failed', 'fallback'] } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: RECENT_FAILURE_LIMIT,
    }),
  ]);
  return {
    failureCount: failedRuns,
    dashboard: {
      runs,
      successRate: percentage(successfulRuns, runs),
      schemaPassRate: percentage(validSchemas, checkedSchemas),
      averageLatencyMs: latency._avg.latencyMs ?? 0,
      fallbacks,
      recentFailures: failures.map((run) =>
        AgentRunViewSchema.parse({ ...run, updatedAt: run.updatedAt.toISOString() }),
      ),
    } satisfies PlatformDashboard['runtime'],
  };
}

async function loadTrendMetrics(prisma: PrismaService, range: TimeRange) {
  const createdAt = rangeFilter(range);
  const [accounts, questions, interviewReports, practiceReports, runs] = await Promise.all([
    prisma.user.findMany({ where: { createdAt }, select: { createdAt: true } }),
    prisma.question.findMany({
      where: { createdAt, status: 'published' },
      select: { createdAt: true },
    }),
    prisma.interviewReport.findMany({ where: { createdAt }, select: { createdAt: true } }),
    prisma.practiceReport.findMany({ where: { createdAt }, select: { createdAt: true } }),
    prisma.agentRun.findMany({ where: { createdAt }, select: { createdAt: true } }),
  ]);
  const trend = createTrendBuckets(range);
  addTrendMetric(trend, accounts, 'accountsCreated');
  addTrendMetric(trend, questions, 'questionsPublished');
  addTrendMetric(trend, interviewReports, 'trainingCompleted');
  addTrendMetric(trend, practiceReports, 'trainingCompleted');
  addTrendMetric(trend, runs, 'agentRuns');
  return Object.values(trend);
}

function createTrendBuckets(range: TimeRange): Record<string, PlatformTrendPoint> {
  const buckets: Record<string, PlatformTrendPoint> = {};
  const cursor = startOfUtcDay(range.startAt);
  const end = startOfUtcDay(range.endAt);
  while (cursor <= end) {
    const date = utcDate(cursor);
    buckets[date] = {
      date,
      accountsCreated: 0,
      questionsPublished: 0,
      trainingCompleted: 0,
      agentRuns: 0,
    };
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return buckets;
}

function addTrendMetric(
  trend: Record<string, PlatformTrendPoint>,
  records: Array<{ createdAt: Date }>,
  metric: keyof Omit<PlatformTrendPoint, 'date'>,
) {
  for (const record of records) {
    const bucket = trend[utcDate(record.createdAt)];
    if (bucket) bucket[metric] += 1;
  }
}

function buildAlerts(
  content: Awaited<ReturnType<typeof loadContentMetrics>>,
  runtimeFailures: number,
  runtime: PlatformDashboard['runtime'],
): PlatformAlert[] {
  const alerts: PlatformAlert[] = [];
  if (content.pendingCandidates > 0) {
    alerts.push({ code: 'review_backlog', severity: 'warning', count: content.pendingCandidates });
  }
  if (content.failedImports > 0) {
    alerts.push({ code: 'failed_imports', severity: 'critical', count: content.failedImports });
  }
  if (runtimeFailures > 0 || runtime.fallbacks > 0 || runtime.successRate < HEALTHY_SUCCESS_RATE) {
    alerts.push({
      code: 'runtime_risk',
      severity: runtimeFailures > 0 ? 'critical' : 'warning',
      count: runtimeFailures + runtime.fallbacks,
    });
  }
  return alerts;
}

function rangeFilter(range: TimeRange) {
  return { gte: range.startAt, lt: range.endAt };
}

function percentage(value: number, total: number): number {
  return total === 0 ? 0 : Number(((value / total) * PERCENT_SCALE).toFixed(1));
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function utcDate(value: Date) {
  return value.toISOString().slice(0, ISO_DATE_LENGTH);
}
