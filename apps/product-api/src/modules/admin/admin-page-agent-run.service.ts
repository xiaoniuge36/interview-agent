import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { maskAdminPageAgentText } from './admin-page-agent-sanitization';
import type {
  AdminPageAgentCompleteRunInput,
  AdminPageAgentCreateRunInput,
  AdminPageAgentHeartbeatRunInput,
} from './admin-page-agent.schemas';

const ACTIVE_STATUSES = ['running', 'waiting_confirmation'] as const;
const RETRYABLE_STATUSES = ['failed', 'cancelled', 'interrupted'] as const;
const STALE_AFTER_MS = 90_000;
const STALE_ERROR_CODE = 'HEARTBEAT_TIMEOUT';
const STALE_ERROR_SUMMARY = '任务心跳超时，可能因页面关闭、浏览器崩溃或服务中断。';
const RUN_HISTORY_LIMIT = 8;

type RunStatus =
  'running' | 'waiting_confirmation' | 'succeeded' | 'failed' | 'cancelled' | 'interrupted';

type RunRecord = {
  id: string;
  tenantId: string;
  userId: string;
  conversationId: string;
  retryOfRunId: string | null;
  clientRequestId: string | null;
  prompt: string;
  status: RunStatus;
  currentStep: string | null;
  tokenCount: number;
  traceId: string;
  errorCode: string | null;
  errorSummary: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  heartbeatAt: Date;
  updatedAt: Date;
};

type RunClient = {
  adminPageAgentConversation: {
    findFirst(args: unknown): Promise<{ id: string } | null>;
  };
  adminPageAgentRun: {
    findFirst(args: unknown): Promise<RunRecord | null>;
    findMany(args: unknown): Promise<RunRecord[]>;
    create(args: unknown): Promise<RunRecord>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
};

@Injectable()
export class AdminPageAgentRunService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    context: ProductRequestContext,
    conversationId: string,
    input: AdminPageAgentCreateRunInput,
  ) {
    await this.requireConversation(context, conversationId);
    const existing = await this.findByClientRequest(context, input.clientRequestId);
    if (existing) return toRun(this.requireSameConversation(existing, conversationId));
    if (input.retryOfRunId)
      await this.requireRetryTarget(context, conversationId, input.retryOfRunId);
    try {
      return toRun(await this.createRecord(context, conversationId, input));
    } catch (error) {
      if (!isUniqueConstraint(error)) throw error;
      const raced = await this.findByClientRequest(context, input.clientRequestId);
      if (!raced) throw error;
      return toRun(this.requireSameConversation(raced, conversationId));
    }
  }

  async latest(context: ProductRequestContext, conversationId: string) {
    await this.requireConversation(context, conversationId);
    await this.reconcileStaleRuns(context, conversationId);
    const latest = await this.client().adminPageAgentRun.findFirst({
      where: { ...this.scope(context), conversationId },
      orderBy: { startedAt: 'desc' },
    });
    return latest ? toRun(latest) : null;
  }

  async list(context: ProductRequestContext, conversationId: string) {
    await this.requireConversation(context, conversationId);
    await this.reconcileStaleRuns(context, conversationId);
    const runs = await this.client().adminPageAgentRun.findMany({
      where: { ...this.scope(context), conversationId },
      orderBy: { startedAt: 'desc' },
      take: RUN_HISTORY_LIMIT,
    });
    return runs.map(toRun);
  }

  private async reconcileStaleRuns(context: ProductRequestContext, conversationId: string) {
    const now = new Date();
    await this.client().adminPageAgentRun.updateMany({
      where: {
        ...this.scope(context),
        conversationId,
        status: { in: [...ACTIVE_STATUSES] },
        heartbeatAt: { lt: new Date(now.getTime() - STALE_AFTER_MS) },
      },
      data: {
        status: 'interrupted',
        finishedAt: now,
        errorCode: STALE_ERROR_CODE,
        errorSummary: STALE_ERROR_SUMMARY,
      },
    });
  }

  async heartbeat(
    context: ProductRequestContext,
    runId: string,
    input: AdminPageAgentHeartbeatRunInput,
  ) {
    const current = await this.requireRun(context, runId);
    if (!isActive(current.status)) throw this.conflict();
    const now = new Date();
    return toRun(
      await this.transitionActive(context, {
        runId,
        data: {
          status: input.status,
          currentStep: sanitized(input.currentStep),
          tokenCount: input.tokenCount,
          heartbeatAt: now,
        },
      }),
    );
  }

  async complete(
    context: ProductRequestContext,
    runId: string,
    input: AdminPageAgentCompleteRunInput,
  ) {
    const current = await this.requireRun(context, runId);
    if (current.status === input.status) return toRun(current);
    if (!isActive(current.status)) throw this.conflict();
    const now = new Date();
    const updated = await this.transitionActive(context, {
      runId,
      data: {
        status: input.status,
        currentStep: sanitized(input.currentStep),
        tokenCount: input.tokenCount,
        errorCode: input.errorCode,
        errorSummary: sanitized(input.errorSummary),
        heartbeatAt: now,
        finishedAt: now,
      },
      idempotentStatus: input.status,
    });
    return toRun(updated);
  }

  private createRecord(
    context: ProductRequestContext,
    conversationId: string,
    input: AdminPageAgentCreateRunInput,
  ) {
    return this.client().adminPageAgentRun.create({
      data: {
        ...this.scope(context),
        conversationId,
        retryOfRunId: input.retryOfRunId,
        clientRequestId: input.clientRequestId,
        prompt: maskAdminPageAgentText(input.prompt),
        status: 'running',
        traceId: context.traceId,
      },
    });
  }

  private findByClientRequest(context: ProductRequestContext, clientRequestId: string) {
    return this.client().adminPageAgentRun.findFirst({
      where: { ...this.scope(context), clientRequestId },
    });
  }

  private async requireRetryTarget(
    context: ProductRequestContext,
    conversationId: string,
    retryOfRunId: string,
  ) {
    const target = await this.client().adminPageAgentRun.findFirst({
      where: {
        ...this.scope(context),
        id: retryOfRunId,
        conversationId,
        status: { in: [...RETRYABLE_STATUSES] },
      },
    });
    if (!target) throw this.notFound('ADMIN_PAGE_AGENT_RETRY_TARGET_NOT_FOUND');
    return target;
  }

  private async requireConversation(context: ProductRequestContext, conversationId: string) {
    const conversation = await this.client().adminPageAgentConversation.findFirst({
      where: { ...this.scope(context), id: conversationId },
      select: { id: true },
    });
    if (!conversation) throw this.notFound('ADMIN_PAGE_AGENT_CONVERSATION_NOT_FOUND');
    return conversation;
  }

  private async requireRun(context: ProductRequestContext, runId: string) {
    const run = await this.client().adminPageAgentRun.findFirst({
      where: { ...this.scope(context), id: runId },
    });
    if (!run) throw this.notFound('ADMIN_PAGE_AGENT_RUN_NOT_FOUND');
    return run;
  }

  private async transitionActive(
    context: ProductRequestContext,
    input: { runId: string; data: Record<string, unknown>; idempotentStatus?: RunStatus },
  ) {
    const result = await this.client().adminPageAgentRun.updateMany({
      where: { ...this.scope(context), id: input.runId, status: { in: [...ACTIVE_STATUSES] } },
      data: input.data,
    });
    const current = await this.requireRun(context, input.runId);
    if (result.count === 1 || current.status === input.idempotentStatus) return current;
    throw this.conflict();
  }

  private requireSameConversation(record: RunRecord, conversationId: string) {
    if (record.conversationId !== conversationId) throw this.conflict();
    return record;
  }

  private scope(context: ProductRequestContext) {
    return { tenantId: context.tenantId, userId: context.actor.id };
  }

  private client() {
    return this.prisma as unknown as RunClient;
  }

  private notFound(code: string) {
    return new NotFoundException({ code, message: '助手运行记录不存在或无权访问。' });
  }

  private conflict() {
    return new ConflictException({
      code: 'ADMIN_PAGE_AGENT_RUN_STATE_CONFLICT',
      message: '助手运行状态已变化，请刷新后重试。',
    });
  }
}

function isActive(status: RunStatus) {
  return ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number]);
}

function sanitized(value: string | undefined) {
  return value === undefined ? undefined : maskAdminPageAgentText(value);
}

function isUniqueConstraint(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function toRun(record: RunRecord) {
  return {
    id: record.id,
    conversationId: record.conversationId,
    retryOfRunId: record.retryOfRunId,
    prompt: record.prompt,
    status: record.status,
    currentStep: record.currentStep,
    tokenCount: record.tokenCount,
    traceId: record.traceId,
    errorCode: record.errorCode,
    errorSummary: record.errorSummary,
    startedAt: record.startedAt.toISOString(),
    finishedAt: record.finishedAt?.toISOString() ?? null,
    heartbeatAt: record.heartbeatAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
