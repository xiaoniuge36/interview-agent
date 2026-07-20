import type { Prisma } from '@prisma/client';
import { AgentRunDetailViewSchema, type AgentRunDetailView } from '@interview-agent/contracts';
import type { PrismaService } from '../../common/database/prisma.service';

export const AGENT_RUN_DETAIL_INCLUDE = {
  tenant: { select: { id: true, name: true } },
  session: {
    select: {
      title: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  command: { select: { type: true } },
} as const satisfies Prisma.AgentRunInclude;

const AI_INVOCATION_SELECT = {
  id: true,
  tenantId: true,
  traceId: true,
  provider: true,
  model: true,
  inputTokens: true,
  outputTokens: true,
  cacheReadTokens: true,
  reasoningTokens: true,
  totalTokens: true,
  latencyMs: true,
  createdAt: true,
} as const satisfies Prisma.AiInvocationSelect;

export type AgentRunDetailRecord = Prisma.AgentRunGetPayload<{
  include: typeof AGENT_RUN_DETAIL_INCLUDE;
}>;

type InvocationRecord = Prisma.AiInvocationGetPayload<{
  select: typeof AI_INVOCATION_SELECT;
}>;
type TokenField =
  | 'inputTokens'
  | 'outputTokens'
  | 'cacheReadTokens'
  | 'reasoningTokens'
  | 'totalTokens'
  | 'latencyMs';

export async function mapAgentRunDetails(
  prisma: PrismaService,
  runs: AgentRunDetailRecord[],
): Promise<AgentRunDetailView[]> {
  const invocations = await loadInvocations(prisma, runs);
  const byTraceId = groupInvocations(invocations);
  return runs.map((run) =>
    AgentRunDetailViewSchema.parse({
      ...run,
      tenant: run.tenant,
      user: run.session?.user ?? null,
      sessionTitle: run.session?.title ?? null,
      command: run.command?.type ?? null,
      modelUsage: modelUsage(byTraceId.get(invocationKey(run.tenantId, run.traceId)) ?? []),
      updatedAt: run.updatedAt.toISOString(),
    }),
  );
}

async function loadInvocations(
  prisma: PrismaService,
  runs: AgentRunDetailRecord[],
): Promise<InvocationRecord[]> {
  const traceIds = [...new Set(runs.map((run) => run.traceId))];
  const tenantIds = [...new Set(runs.map((run) => run.tenantId))];
  if (!traceIds.length) return [];
  return prisma.aiInvocation.findMany({
    where: { tenantId: { in: tenantIds }, traceId: { in: traceIds } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: AI_INVOCATION_SELECT,
  });
}

function groupInvocations(records: InvocationRecord[]): Map<string, InvocationRecord[]> {
  const groups = new Map<string, InvocationRecord[]>();
  for (const record of records) {
    const key = invocationKey(record.tenantId, record.traceId);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }
  return groups;
}

function invocationKey(tenantId: string, traceId: string): string {
  return `${tenantId}:${traceId}`;
}

function modelUsage(records: InvocationRecord[]): AgentRunDetailView['modelUsage'] {
  const latest = records[0];
  if (!latest) return null;
  return {
    provider: latest.provider,
    model: latest.model,
    invocationCount: records.length,
    inputTokens: sumNullable(records, 'inputTokens'),
    outputTokens: sumNullable(records, 'outputTokens'),
    cacheReadTokens: sumNullable(records, 'cacheReadTokens'),
    reasoningTokens: sumNullable(records, 'reasoningTokens'),
    totalTokens: sumNullable(records, 'totalTokens'),
    latencyMs: sumNullable(records, 'latencyMs'),
  };
}

function sumNullable(records: InvocationRecord[], field: TokenField): number | null {
  const values = records
    .map((record) => record[field])
    .filter((value): value is number => value !== null);
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
}
