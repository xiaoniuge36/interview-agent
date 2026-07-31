import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AgentRuntimeNextRequestSchema,
  type AgentRuntimeNextRequest,
  PracticeReportRuntimeRequestSchema,
  PracticeReportRuntimeResponseSchema,
  type PracticeReportRuntimeRequest,
  type PracticeReportRuntimeResponse,
} from '@interview-agent/contracts';
import { performance } from 'node:perf_hooks';
import type { Environment } from '../../common/config/environment';
import type { ProductRequestContext } from '../../common/context/request-context';
import { withTraceSpan } from '../../common/telemetry/telemetry';
import * as cancellation from './agent-runtime.cancellation';
import { invocationError, localFallback, runtimeResult } from './agent-runtime.fallback';
import {
  parseRuntimeDecision,
  responseFailure,
  unavailableFailure,
} from './agent-runtime.response';
import type {
  AgentNextInput,
  AgentNextResult,
  AgentRuntimeProgress,
  RuntimeFailure,
  RuntimeInvocationOutcome,
} from './agent-runtime.types';
import { ModelInvocationGrantService } from './model-invocation-grant.service';
import { UserModelRuntimeClient } from './user-model-runtime.client';

const CONTRACT_VERSION = 'interview-runtime.v1' as const;
const MAX_RETRY_DELAY_MS = 5_000;
const RETRY_MULTIPLIER = 2;

export type AgentPracticeReportInput = Omit<
  PracticeReportRuntimeRequest,
  'contractVersion' | 'modelInvocationGrant'
>;

export * from './agent-runtime.types';

@Injectable()
export class AgentRuntimeClient {
  private readonly logger = new Logger(AgentRuntimeClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly retryBaseMs: number;
  private readonly fallbackEnabled: boolean;
  private readonly token: string;

  constructor(
    config: ConfigService<Environment, true>,
    @Optional() private readonly userModels?: UserModelRuntimeClient,
    @Optional() private readonly grants?: ModelInvocationGrantService,
  ) {
    this.baseUrl = config.get('AGENT_RUNTIME_URL', { infer: true }).replace(/\/$/, '');
    this.timeoutMs = config.get('AGENT_RUNTIME_TIMEOUT_MS', { infer: true });
    this.maxAttempts = config.get('AGENT_RUNTIME_MAX_ATTEMPTS', { infer: true });
    this.retryBaseMs = config.get('AGENT_RUNTIME_RETRY_BASE_MS', { infer: true });
    this.fallbackEnabled = config.get('AGENT_RUNTIME_FALLBACK_ENABLED', { infer: true });
    this.token = config.get('INTERNAL_AGENT_TOKEN', { infer: true });
  }

  async next(
    input: AgentNextInput,
    context?: ProductRequestContext,
    progress: AgentRuntimeProgress = {},
  ): Promise<AgentNextResult> {
    const startedAt = performance.now();
    if (cancellation.callerCancelled(progress.signal)) {
      return this.fallbackOrThrow({
        input,
        failure: cancellation.cancelledFailure(),
        attempts: 0,
        startedAt,
      });
    }
    if (context && this.userModels && progress.onContentDelta) {
      return this.userModels.nextStream({ context, input }, progress);
    }
    const modelInvocationGrant =
      context && this.grants
        ? await this.grants.issue(context, {
            sessionId: input.session.id,
            commandId: input.commandId,
            operation: 'interview_next',
            traceId: input.traceId,
          })
        : undefined;
    const request = AgentRuntimeNextRequestSchema.parse({
      contractVersion: CONTRACT_VERSION,
      ...input,
      ...(modelInvocationGrant ? { modelInvocationGrant } : {}),
    });
    const outcome = await this.invokeWithRetries(request, input.traceId, progress.signal);
    if ('decision' in outcome.result) {
      return runtimeResult({
        decision: outcome.result.decision,
        latencyMs: elapsed(startedAt),
        attempts: outcome.attempts,
        fallbackUsed: false,
        schemaValid: true,
      });
    }
    return this.fallbackOrThrow({
      input,
      failure: outcome.result,
      attempts: outcome.attempts,
      startedAt,
    });
  }

  async report(
    input: AgentPracticeReportInput,
    context: ProductRequestContext,
  ): Promise<PracticeReportRuntimeResponse> {
    if (!this.grants) throw reportUnavailable();
    const modelInvocationGrant = await this.grants.issue(context, {
      sessionId: input.session.id,
      commandId: input.commandId,
      operation: 'practice_report',
      traceId: input.traceId,
    });
    const request = PracticeReportRuntimeRequestSchema.parse({
      contractVersion: 'practice-report-runtime.v1',
      ...input,
      modelInvocationGrant,
    });
    return withTraceSpan(
      'agent_runtime.practice_report',
      {
        'interview_agent.trace_id': context.traceId,
        'session.id': input.session.id,
        operation: 'practice_report',
      },
      () => this.invokePracticeReport(request, context.traceId),
    );
  }

  private async invokePracticeReport(
    request: PracticeReportRuntimeRequest,
    traceId: string,
  ): Promise<PracticeReportRuntimeResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/practice/report`, {
        method: 'POST',
        headers: this.headers(traceId),
        body: JSON.stringify(request),
        signal: controller.signal,
        redirect: 'error',
      });
      if (!response.ok) throw reportUnavailable();
      return PracticeReportRuntimeResponseSchema.parse(await response.json());
    } catch {
      throw reportUnavailable();
    } finally {
      clearTimeout(timer);
    }
  }

  private async invokeWithRetries(
    request: AgentRuntimeNextRequest,
    traceId: string,
    signal?: AbortSignal,
  ): Promise<{ result: RuntimeInvocationOutcome; attempts: number }> {
    let result: RuntimeInvocationOutcome = unavailableFailure('AGENT_RUNTIME_UNAVAILABLE');
    for (let attempts = 1; attempts <= this.maxAttempts; attempts += 1) {
      if (cancellation.callerCancelled(signal)) {
        return { result: cancellation.cancelledFailure(), attempts: attempts - 1 };
      }
      result = await this.invoke(request, traceId, signal);
      if ('decision' in result || !result.retryable || attempts === this.maxAttempts) {
        return { result, attempts };
      }
      if (!(await this.waitBeforeRetry(attempts, signal))) {
        return { result: cancellation.cancelledFailure(), attempts };
      }
    }
    return { result, attempts: this.maxAttempts };
  }

  private async invoke(
    request: AgentRuntimeNextRequest,
    traceId: string,
    signal?: AbortSignal,
  ): Promise<RuntimeInvocationOutcome> {
    return withTraceSpan(
      'agent_runtime.interview_next',
      {
        'interview_agent.trace_id': traceId,
        'session.id': request.session.id,
        operation: 'interview_next',
      },
      () => this.invokeRequest(request, traceId, signal),
    );
  }

  private async invokeRequest(
    request: AgentRuntimeNextRequest,
    traceId: string,
    callerSignal?: AbortSignal,
  ): Promise<RuntimeInvocationOutcome> {
    if (cancellation.callerCancelled(callerSignal)) return cancellation.cancelledFailure();
    const timeoutController = new AbortController();
    const signal = cancellation.invocationSignal(callerSignal, timeoutController.signal);
    const timer = setTimeout(() => timeoutController.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/interviews/next`, {
        method: 'POST',
        headers: this.headers(traceId),
        body: JSON.stringify(request),
        signal,
        redirect: 'error',
      });
      if (cancellation.callerCancelled(callerSignal)) return cancellation.cancelledFailure();
      if (!response.ok) return responseFailure(response);
      const allowedSources = new Set(request.retrievalContext?.map((source) => source.sourceId));
      const result = await parseRuntimeDecision(response, allowedSources);
      return cancellation.callerCancelled(callerSignal) ? cancellation.cancelledFailure() : result;
    } catch {
      return cancellation.abortFailure(callerSignal, timeoutController.signal);
    } finally {
      clearTimeout(timer);
    }
  }

  private fallbackOrThrow(input: {
    input: AgentNextInput;
    failure: RuntimeFailure;
    attempts: number;
    startedAt: number;
  }): AgentNextResult {
    const latencyMs = elapsed(input.startedAt);
    if (
      this.fallbackEnabled &&
      input.failure.kind !== 'rejected' &&
      input.failure.code !== 'AGENT_RUNTIME_CANCELLED'
    ) {
      return runtimeResult({
        decision: localFallback(input.input.session, input.input.answer),
        latencyMs,
        attempts: input.attempts,
        fallbackUsed: true,
        schemaValid: input.failure.schemaValid,
      });
    }
    this.logger.warn(
      `Agent Runtime failed code=${input.failure.code} attempts=${input.attempts} traceId=${input.input.traceId}`,
    );
    throw invocationError({
      failure: input.failure,
      latencyMs,
      attempts: input.attempts,
    });
  }

  private headers(traceId: string) {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-internal-agent-token': this.token,
      'x-service-name': 'product-api',
      'x-trace-id': traceId,
    };
  }

  private async waitBeforeRetry(attempt: number, signal?: AbortSignal) {
    const exponential = this.retryBaseMs * RETRY_MULTIPLIER ** (attempt - 1);
    const jitter = Math.floor(Math.random() * this.retryBaseMs);
    const delayMs = Math.min(exponential + jitter, MAX_RETRY_DELAY_MS);
    if (!signal) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return true;
    }
    if (signal.aborted) return false;
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => settle(true), delayMs);
      const onAbort = () => settle(false);
      const settle = (retry: boolean) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        resolve(retry);
      };
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }
}

function elapsed(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function reportUnavailable() {
  return new Error('PRACTICE_REPORT_RUNTIME_UNAVAILABLE');
}
