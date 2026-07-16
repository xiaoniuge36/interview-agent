import { AgentRunViewSchema, type PlatformDashboard } from '@interview-agent/contracts';
import type { PrismaService } from '../../common/database/prisma.service';

const RECENT_FAILURE_LIMIT = 4;
const PERCENT_SCALE = 100;
const PLATFORM_ADMIN_ROLES = ['platform_admin', 'admin', 'question_reviewer', 'support'] as const;

export type TimeRange = { startAt: Date; endAt: Date };

export async function loadPlatformDashboardMetrics(prisma: PrismaService, range: TimeRange) {
  const [accounts, content, training, runtime] = await Promise.all([
    loadAccountMetrics(prisma, range),
    loadContentMetrics(prisma, range),
    loadTrainingMetrics(prisma, range),
    loadRuntimeMetrics(prisma, range),
  ]);
  return { accounts, content, training, runtime };
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
  const [runs, successfulRuns, validSchemas, checkedSchemas, fallbacks, latency, failures] =
    await Promise.all([
      prisma.agentRun.count({ where: { createdAt } }),
      prisma.agentRun.count({ where: { createdAt, status: 'succeeded' } }),
      prisma.agentRun.count({ where: { createdAt, schemaValid: true } }),
      prisma.agentRun.count({ where: { createdAt, schemaValid: { not: null } } }),
      prisma.agentRun.count({ where: { createdAt, fallbackUsed: true } }),
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
    runs,
    successRate: percentage(successfulRuns, runs),
    schemaPassRate: percentage(validSchemas, checkedSchemas),
    averageLatencyMs: latency._avg.latencyMs ?? 0,
    fallbacks,
    recentFailures: failures.map((run) =>
      AgentRunViewSchema.parse({ ...run, updatedAt: run.updatedAt.toISOString() }),
    ),
  } satisfies PlatformDashboard['runtime'];
}

function rangeFilter(range: TimeRange) {
  return { gte: range.startAt, lt: range.endAt };
}

function percentage(value: number, total: number): number {
  return total === 0 ? 0 : Number(((value / total) * PERCENT_SCALE).toFixed(1));
}
