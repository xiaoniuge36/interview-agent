import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { maskUserPageAgentText } from './user-page-agent-sanitization';
import type {
  UserPageAgentCompleteRunInput,
  UserPageAgentCreateRunInput,
  UserPageAgentHeartbeatRunInput,
} from './user-page-agent.schemas';

const ACTIVE_STATUSES = ['running', 'waiting_confirmation'] as const;
const RETRYABLE_STATUSES = ['failed', 'cancelled', 'interrupted'] as const;
const STALE_AFTER_MS = 90_000;
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
  userAgentConversation: { findFirst(args: unknown): Promise<{ id: string } | null> };
  userPageAgentRun: {
    findFirst(args: unknown): Promise<RunRecord | null>;
    findMany(args: unknown): Promise<RunRecord[]>;
    create(args: unknown): Promise<RunRecord>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
};
type ActiveTransition = {
  runId: string;
  data: Record<string, unknown>;
  idempotentStatus?: RunStatus;
};

@Injectable()
export class UserPageAgentRunService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    context: ProductRequestContext,
    conversationId: string,
    input: UserPageAgentCreateRunInput,
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
    const run = await this.client().userPageAgentRun.findFirst({
      where: { ...this.scope(context), conversationId },
      orderBy: { startedAt: 'desc' },
    });
    return run ? toRun(run) : null;
  }

  async list(context: ProductRequestContext, conversationId: string) {
    await this.requireConversation(context, conversationId);
    await this.reconcileStaleRuns(context, conversationId);
    const runs = await this.client().userPageAgentRun.findMany({
      where: { ...this.scope(context), conversationId },
      orderBy: { startedAt: 'desc' },
      take: RUN_HISTORY_LIMIT,
    });
    return runs.map(toRun);
  }

  async heartbeat(
    context: ProductRequestContext,
    runId: string,
    input: UserPageAgentHeartbeatRunInput,
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

  async complete(
    context: ProductRequestContext,
    runId: string,
    input: UserPageAgentCompleteRunInput,
  ) {
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
    return this.client().userPageAgentRun.updateMany({
      where: {
        ...this.scope(context),
        conversationId,
        status: { in: [...ACTIVE_STATUSES] },
        heartbeatAt: { lt: new Date(now.getTime() - STALE_AFTER_MS) },
      },
      data: {
        status: 'interrupted',
        finishedAt: now,
        errorCode: 'HEARTBEAT_TIMEOUT',
        errorSummary: '任务心跳超时，可能因页面关闭、浏览器崩溃或服务中断。',
      },
    });
  }

  private createRecord(
    context: ProductRequestContext,
    conversationId: string,
    input: UserPageAgentCreateRunInput,
  ) {
    return this.client().userPageAgentRun.create({
      data: {
        ...this.scope(context),
        conversationId,
        retryOfRunId: input.retryOfRunId,
        clientRequestId: input.clientRequestId,
        prompt: maskUserPageAgentText(input.prompt),
        status: 'running',
        traceId: context.traceId,
      },
    });
  }

  private findByClientRequest(context: ProductRequestContext, clientRequestId: string) {
    return this.client().userPageAgentRun.findFirst({
      where: { ...this.scope(context), clientRequestId },
    });
  }

  private async requireRetryTarget(
    context: ProductRequestContext,
    conversationId: string,
    retryOfRunId: string,
  ) {
    const run = await this.client().userPageAgentRun.findFirst({
      where: {
        ...this.scope(context),
        id: retryOfRunId,
        conversationId,
        status: { in: [...RETRYABLE_STATUSES] },
      },
    });
    if (!run) throw this.notFound('USER_PAGE_AGENT_RETRY_TARGET_NOT_FOUND');
    return run;
  }

  private async requireConversation(context: ProductRequestContext, conversationId: string) {
    const conversation = await this.client().userAgentConversation.findFirst({
      where: { ...this.scope(context), id: conversationId },
      select: { id: true },
    });
    if (!conversation) throw this.notFound('USER_PAGE_AGENT_CONVERSATION_NOT_FOUND');
    return conversation;
  }

  private async requireRun(context: ProductRequestContext, runId: string) {
    const run = await this.client().userPageAgentRun.findFirst({
      where: { ...this.scope(context), id: runId },
    });
    if (!run) throw this.notFound('USER_PAGE_AGENT_RUN_NOT_FOUND');
    return run;
  }

  private async transitionActive(context: ProductRequestContext, input: ActiveTransition) {
    const result = await this.client().userPageAgentRun.updateMany({
      where: { ...this.scope(context), id: input.runId, status: { in: [...ACTIVE_STATUSES] } },
      data: input.data,
    });
    const current = await this.requireRun(context, input.runId);
    if (result.count === 1 || current.status === input.idempotentStatus) return current;
    throw this.conflict();
  }

  private requireSameConversation(run: RunRecord, conversationId: string) {
    if (run.conversationId !== conversationId) throw this.conflict();
    return run;
  }

  private scope(context: ProductRequestContext) {
    return { tenantId: context.tenantId, userId: context.actor.id };
  }

  private client() {
    return this.prisma as unknown as RunClient;
  }

  private notFound(code: string) {
    return new NotFoundException({ code, message: '训练运行记录不存在或无权访问。' });
  }

  private conflict() {
    return new ConflictException({
      code: 'USER_PAGE_AGENT_RUN_STATE_CONFLICT',
      message: '训练运行状态已变化，请刷新后重试。',
    });
  }
}

function isActive(status: RunStatus) {
  return ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number]);
}

function sanitized(value: string | undefined) {
  return value === undefined ? undefined : maskUserPageAgentText(value);
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
