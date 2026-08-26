import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ProductRequestContext } from '../../common/context/request-context';
import { maskPageAgentText } from './page-agent-sanitization';
import type {
  PageAgentCompleteRunInput,
  PageAgentCreateRunInput,
  PageAgentHeartbeatRunInput,
} from './page-agent.schemas';

const ACTIVE_STATUSES = ['running', 'waiting_confirmation'] as const;
const RETRYABLE_STATUSES = ['failed', 'cancelled', 'interrupted'] as const;
const STALE_AFTER_MS = 90_000;
const STALE_ERROR_CODE = 'HEARTBEAT_TIMEOUT';
const STALE_ERROR_SUMMARY = '任务心跳超时，可能因页面关闭、浏览器崩溃或服务中断。';
const RUN_HISTORY_LIMIT = 8;

export type PageAgentRunStatus =
  'running' | 'waiting_confirmation' | 'succeeded' | 'failed' | 'cancelled' | 'interrupted';

export type PageAgentRunRecord = {
  id: string;
  tenantId: string;
  userId: string;
  conversationId: string;
  retryOfRunId: string | null;
  clientRequestId: string | null;
  prompt: string;
  status: PageAgentRunStatus;
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

export type PageAgentRunClient = {
  conversations: { findFirst(args: unknown): Promise<{ id: string } | null> };
  runs: {
    findFirst(args: unknown): Promise<PageAgentRunRecord | null>;
    findMany(args: unknown): Promise<PageAgentRunRecord[]>;
    create(args: unknown): Promise<PageAgentRunRecord>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
};

export type PageAgentRunErrors = {
  notFoundMessage: string;
  conversationNotFoundCode: string;
  runNotFoundCode: string;
  retryTargetNotFoundCode: string;
  conflict: { code: string; message: string };
};

export type PageAgentRunBinding = {
  client: PageAgentRunClient;
  errors: PageAgentRunErrors;
};

type ActiveTransition = {
  runId: string;
  data: Record<string, unknown>;
  idempotentStatus?: PageAgentRunStatus;
};

export class PageAgentRunCore {
  constructor(private readonly binding: PageAgentRunBinding) {}

  async create(
    context: ProductRequestContext,
    conversationId: string,
    input: PageAgentCreateRunInput,
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
    const latest = await this.binding.client.runs.findFirst({
      where: { ...this.scope(context), conversationId },
      orderBy: { startedAt: 'desc' },
    });
    return latest ? toRun(latest) : null;
  }

  async list(context: ProductRequestContext, conversationId: string) {
    await this.requireConversation(context, conversationId);
    await this.reconcileStaleRuns(context, conversationId);
    const runs = await this.binding.client.runs.findMany({
      where: { ...this.scope(context), conversationId },
      orderBy: { startedAt: 'desc' },
      take: RUN_HISTORY_LIMIT,
    });
    return runs.map(toRun);
  }

  async heartbeat(
    context: ProductRequestContext,
    runId: string,
    input: PageAgentHeartbeatRunInput,
  ) {
    const current = await this.requireRun(context, runId);
    if (!isActive(current.status)) throw this.conflict();
    return toRun(
      await this.transitionActive(context, {
        runId,
        data: {
          status: input.status,
          currentStep: sanitized(input.currentStep),
          tokenCount: input.tokenCount,
          heartbeatAt: new Date(),
        },
      }),
    );
  }

  async complete(context: ProductRequestContext, runId: string, input: PageAgentCompleteRunInput) {
    const current = await this.requireRun(context, runId);
    if (current.status === input.status) return toRun(current);
    if (!isActive(current.status)) throw this.conflict();
    const now = new Date();
    return toRun(
      await this.transitionActive(context, {
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
      }),
    );
  }

  private reconcileStaleRuns(context: ProductRequestContext, conversationId: string) {
    const now = new Date();
    return this.binding.client.runs.updateMany({
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

  private createRecord(
    context: ProductRequestContext,
    conversationId: string,
    input: PageAgentCreateRunInput,
  ) {
    return this.binding.client.runs.create({
      data: {
        ...this.scope(context),
        conversationId,
        retryOfRunId: input.retryOfRunId,
        clientRequestId: input.clientRequestId,
        prompt: maskPageAgentText(input.prompt),
        status: 'running',
        traceId: context.traceId,
      },
    });
  }

  private findByClientRequest(context: ProductRequestContext, clientRequestId: string) {
    return this.binding.client.runs.findFirst({
      where: { ...this.scope(context), clientRequestId },
    });
  }

  private async requireRetryTarget(
    context: ProductRequestContext,
    conversationId: string,
    retryOfRunId: string,
  ) {
    const target = await this.binding.client.runs.findFirst({
      where: {
        ...this.scope(context),
        id: retryOfRunId,
        conversationId,
        status: { in: [...RETRYABLE_STATUSES] },
      },
    });
    if (!target) throw this.notFound(this.binding.errors.retryTargetNotFoundCode);
    return target;
  }

  private async requireConversation(context: ProductRequestContext, conversationId: string) {
    const conversation = await this.binding.client.conversations.findFirst({
      where: { ...this.scope(context), id: conversationId },
      select: { id: true },
    });
    if (!conversation) throw this.notFound(this.binding.errors.conversationNotFoundCode);
    return conversation;
  }

  private async requireRun(context: ProductRequestContext, runId: string) {
    const run = await this.binding.client.runs.findFirst({
      where: { ...this.scope(context), id: runId },
    });
    if (!run) throw this.notFound(this.binding.errors.runNotFoundCode);
    return run;
  }

  private async transitionActive(context: ProductRequestContext, input: ActiveTransition) {
    const result = await this.binding.client.runs.updateMany({
      where: { ...this.scope(context), id: input.runId, status: { in: [...ACTIVE_STATUSES] } },
      data: input.data,
    });
    const current = await this.requireRun(context, input.runId);
    if (result.count === 1 || current.status === input.idempotentStatus) return current;
    throw this.conflict();
  }

  private requireSameConversation(record: PageAgentRunRecord, conversationId: string) {
    if (record.conversationId !== conversationId) throw this.conflict();
    return record;
  }

  private scope(context: ProductRequestContext) {
    return { tenantId: context.tenantId, userId: context.actor.id };
  }

  private notFound(code: string) {
    return new NotFoundException({ code, message: this.binding.errors.notFoundMessage });
  }

  private conflict() {
    return new ConflictException({
      code: this.binding.errors.conflict.code,
      message: this.binding.errors.conflict.message,
    });
  }
}

function isActive(status: PageAgentRunStatus) {
  return ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number]);
}

function sanitized(value: string | undefined) {
  return value === undefined ? undefined : maskPageAgentText(value);
}

function isUniqueConstraint(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function toRun(record: PageAgentRunRecord) {
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
