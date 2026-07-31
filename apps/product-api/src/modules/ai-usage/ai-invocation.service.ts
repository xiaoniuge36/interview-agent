import { BadGatewayException, HttpException, Injectable, Logger } from '@nestjs/common';
import type { AiInvocationOperation, ModelProvider } from '@interview-agent/contracts';
import { PrismaService } from '../../common/database/prisma.service';
import type { ModelTokenUsage } from '../model-credential/model-provider-stream';
import { AiBudgetPolicy, type AiOperationBudget } from './ai-budget-policy';
import { AiCircuitBreaker } from './ai-circuit-breaker';

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const DAY_MS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const RETENTION_DAYS = 90;

export type AiInvocationMetadata = {
  tenantId: string;
  userId: string;
  credentialId?: string;
  sessionId?: string;
  practiceSessionId?: string;
  practiceItemId?: string;
  operation: AiInvocationOperation;
  provider: ModelProvider;
  model: string;
  traceId: string;
  inputCharacters?: number;
};

type InvocationStatus = 'succeeded' | 'failed' | 'cancelled';
type UsageHandler = (usage: ModelTokenUsage) => void;
type InvocationRunner<T> = (onUsage: UsageHandler, budget?: AiOperationBudget) => Promise<T>;

type InvocationData = AiInvocationMetadata &
  ModelTokenUsage & {
    status: InvocationStatus;
    latencyMs: number;
    errorCode: string | null;
    startedAt: Date;
    finishedAt: Date;
  };

type InvocationAttempt = {
  metadata: AiInvocationMetadata;
  usage: ModelTokenUsage;
  startedAt: Date;
  startedAtMs: number;
};

type InvocationStore = {
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  deleteMany: (args: { where: { createdAt: { lt: Date } } }) => Promise<unknown>;
};

@Injectable()
export class AiInvocationService {
  private readonly logger = new Logger(AiInvocationService.name);
  private lastCleanupAt: Date | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly budgets: AiBudgetPolicy,
    private readonly circuits: AiCircuitBreaker,
  ) {}

  async measure<T>(metadata: AiInvocationMetadata, run: InvocationRunner<T>): Promise<T> {
    const attempt: InvocationAttempt = {
      metadata,
      usage: {},
      startedAt: new Date(),
      startedAtMs: performance.now(),
    };
    const decision = this.budgets.check({
      operation: metadata.operation,
      ...(metadata.inputCharacters === undefined
        ? {}
        : { inputCharacters: metadata.inputCharacters }),
    });
    if (!decision.allowed) return this.reject(attempt, decision.code);
    const circuitKey = [metadata.provider, metadata.model, metadata.operation].join(':');
    if (!this.circuits.allow(circuitKey)) return this.reject(attempt, 'AI_CIRCUIT_OPEN');
    try {
      const result = await run((next) => {
        attempt.usage = mergeUsage(attempt.usage, next);
      }, decision.budget);
      this.circuits.recordSuccess(circuitKey);
      await this.recordSafely(outcomeData({ attempt, status: 'succeeded', errorCode: null }));
      return result;
    } catch (error) {
      if (isCircuitFailure(error)) this.circuits.recordFailure(circuitKey);
      else if (this.circuits.state(circuitKey) === 'half_open') {
        this.circuits.recordSuccess(circuitKey);
      }
      const status: InvocationStatus = isAbort(error) ? 'cancelled' : 'failed';
      await this.recordSafely(
        outcomeData({ attempt, status, errorCode: errorCode(error, status) }),
      );
      throw error;
    }
  }

  private async reject(
    attempt: InvocationAttempt,
    code: 'AI_BUDGET_EXHAUSTED' | 'AI_CIRCUIT_OPEN',
  ): Promise<never> {
    await this.recordSafely(outcomeData({ attempt, status: 'failed', errorCode: code }));
    throw new BadGatewayException({ code, message: guardrailMessage(code) });
  }

  private async recordSafely(data: InvocationData): Promise<void> {
    try {
      await invocationStore(this.prisma).create({ data: storageData(data) });
    } catch (error) {
      this.logger.warn(`AI invocation log write failed traceId=${data.traceId}`, error);
      return;
    }
    await this.cleanupSafely(data.finishedAt);
  }

  private async cleanupSafely(now: Date): Promise<void> {
    if (this.lastCleanupAt && now.getTime() - this.lastCleanupAt.getTime() < DAY_MS) return;
    this.lastCleanupAt = now;
    try {
      await invocationStore(this.prisma).deleteMany({ where: { createdAt: { lt: expiry(now) } } });
    } catch (error) {
      this.logger.warn('AI invocation retention cleanup failed', error);
    }
  }
}

function outcomeData(input: {
  attempt: InvocationAttempt;
  status: InvocationStatus;
  errorCode: string | null;
}): InvocationData {
  return {
    ...input.attempt.metadata,
    ...input.attempt.usage,
    status: input.status,
    latencyMs: elapsed(input.attempt.startedAtMs),
    errorCode: input.errorCode,
    startedAt: input.attempt.startedAt,
    finishedAt: new Date(),
  };
}

function storageData(data: InvocationData): Record<string, unknown> {
  const stored: Record<string, unknown> = { ...data };
  delete stored.inputCharacters;
  return {
    ...stored,
    credentialId: data.credentialId ?? null,
    sessionId: data.sessionId ?? null,
    practiceSessionId: data.practiceSessionId ?? null,
    practiceItemId: data.practiceItemId ?? null,
    inputTokens: data.inputTokens ?? null,
    outputTokens: data.outputTokens ?? null,
    cacheReadTokens: data.cacheReadTokens ?? null,
    reasoningTokens: data.reasoningTokens ?? null,
    totalTokens: data.totalTokens ?? null,
  };
}

function invocationStore(prisma: PrismaService): InvocationStore {
  return (prisma as unknown as { aiInvocation: InvocationStore }).aiInvocation;
}

function mergeUsage(previous: ModelTokenUsage, next: ModelTokenUsage): ModelTokenUsage {
  const merged = { ...previous, ...next };
  if (
    next.totalTokens === undefined &&
    merged.inputTokens !== undefined &&
    merged.outputTokens !== undefined
  ) {
    merged.totalTokens = merged.inputTokens + merged.outputTokens;
  }
  return merged;
}

function errorCode(error: unknown, status: InvocationStatus): string | null {
  if (status === 'cancelled') return null;
  if (error instanceof HttpException) return responseCode(error) ?? 'MODEL_PROVIDER_UNAVAILABLE';
  if (hasModelCode(error)) return error.code;
  return 'MODEL_PROVIDER_UNAVAILABLE';
}

function responseCode(error: HttpException): string | undefined {
  const response = error.getResponse();
  if (typeof response !== 'object' || response === null) return undefined;
  const code = (response as Record<string, unknown>).code;
  return typeof code === 'string' && /^(MODEL|AI)_/u.test(code) ? code : undefined;
}

function hasModelCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    /^(MODEL_|EMBEDDING_)/u.test((error as { code: string }).code)
  );
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'ABORT_ERR');
}

function expiry(now: Date): Date {
  return new Date(now.getTime() - RETENTION_DAYS * DAY_MS);
}

function elapsed(startedAtMs: number): number {
  return Math.max(0, Math.round(performance.now() - startedAtMs));
}

function isCircuitFailure(error: unknown) {
  const code = hasModelCode(error) ? error.code : responseCodeFor(error);
  return [
    'MODEL_PROVIDER_RATE_LIMITED',
    'MODEL_PROVIDER_TIMEOUT',
    'MODEL_PROVIDER_UNAVAILABLE',
    'EMBEDDING_TIMEOUT',
  ].includes(code ?? '');
}

function responseCodeFor(error: unknown) {
  return error instanceof HttpException ? responseCode(error) : undefined;
}

function guardrailMessage(code: 'AI_BUDGET_EXHAUSTED' | 'AI_CIRCUIT_OPEN') {
  return code === 'AI_BUDGET_EXHAUSTED'
    ? '本次模型任务超过服务端预算上限，请缩短输入后重试。'
    : '模型服务暂时进入保护状态，请稍后重试。';
}
