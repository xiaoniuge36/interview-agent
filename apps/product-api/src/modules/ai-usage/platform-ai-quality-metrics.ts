import type { PlatformAiQuality } from '@interview-agent/contracts';
import type { PrismaService } from '../../common/database/prisma.service';
import type { AiUsageTimeRange } from './ai-usage-metrics';

const PERCENT_SCALE = 100;

export async function loadPlatformAiQuality(
  prisma: PrismaService,
  range: AiUsageTimeRange,
  budgetRejected: number,
): Promise<PlatformAiQuality> {
  const createdAt = { gte: range.startAt, lt: range.endAt };
  const [
    deadLetterJobs,
    totalChunks,
    readyChunks,
    latency,
    checkedRuns,
    validRuns,
    runs,
    fallbacks,
  ] = await Promise.all([
    prisma.backgroundJob.count({ where: { status: 'dead_letter', updatedAt: createdAt } }),
    prisma.retrievalChunk.count({ where: { createdAt } }),
    prisma.retrievalChunk.count({ where: { createdAt, status: 'ready' } }),
    prisma.retrievalLog.aggregate({ where: { createdAt }, _avg: { latencyMs: true } }),
    prisma.agentRun.count({ where: { createdAt, schemaValid: { not: null } } }),
    prisma.agentRun.count({ where: { createdAt, schemaValid: true } }),
    prisma.agentRun.count({ where: { createdAt } }),
    prisma.agentRun.count({ where: { createdAt, fallbackUsed: true } }),
  ]);

  return {
    deadLetterJobs,
    embeddingCoverage: percentage(readyChunks, totalChunks),
    retrievalLatencyMs: Math.round(latency._avg.latencyMs ?? 0),
    schemaPassRate: percentage(validRuns, checkedRuns),
    fallbackRate: percentage(fallbacks, runs),
    budgetRejected,
  };
}

function percentage(value: number, total: number): number {
  return total === 0 ? 0 : Number(((value / total) * PERCENT_SCALE).toFixed(2));
}
