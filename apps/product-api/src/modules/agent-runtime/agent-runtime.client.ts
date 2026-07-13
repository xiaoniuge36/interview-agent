import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AgentRuntimeNextRequestSchema,
  type AgentRuntimeNextRequest,
} from '@interview-agent/contracts';
import { performance } from 'node:perf_hooks';
import type { Environment } from '../../common/config/environment';
import { invocationError, localFallback, runtimeResult } from './agent-runtime.fallback';
import { httpFailure, parseRuntimeDecision, unavailableFailure } from './agent-runtime.response';
import type {
  AgentNextInput,
  AgentNextResult,
  RuntimeFailure,
  RuntimeInvocationOutcome,
} from './agent-runtime.types';

const CONTRACT_VERSION = 'interview-runtime.v1' as const;
const MAX_RETRY_DELAY_MS = 5_000;
const RETRY_MULTIPLIER = 2;

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

  constructor(config: ConfigService<Environment, true>) {
    this.baseUrl = config.get('AGENT_RUNTIME_URL', { infer: true }).replace(/\/$/, '');
    this.timeoutMs = config.get('AGENT_RUNTIME_TIMEOUT_MS', { infer: true });
    this.maxAttempts = config.get('AGENT_RUNTIME_MAX_ATTEMPTS', { infer: true });
    this.retryBaseMs = config.get('AGENT_RUNTIME_RETRY_BASE_MS', { infer: true });
    this.fallbackEnabled = config.get('AGENT_RUNTIME_FALLBACK_ENABLED', { infer: true });
    this.token = config.get('INTERNAL_AGENT_TOKEN', { infer: true });
  }

  async next(input: AgentNextInput): Promise<AgentNextResult> {
    const startedAt = performance.now();
    const request = AgentRuntimeNextRequestSchema.parse({
      contractVersion: CONTRACT_VERSION,
      ...input,
    });
    const outcome = await this.invokeWithRetries(request, input.traceId);
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

  private async invokeWithRetries(
    request: AgentRuntimeNextRequest,
    traceId: string,
  ): Promise<{ result: RuntimeInvocationOutcome; attempts: number }> {
    let result: RuntimeInvocationOutcome = unavailableFailure('AGENT_RUNTIME_UNAVAILABLE');
    for (let attempts = 1; attempts <= this.maxAttempts; attempts += 1) {
      result = await this.invoke(request, traceId);
      if ('decision' in result || !result.retryable || attempts === this.maxAttempts) {
        return { result, attempts };
      }
      await this.waitBeforeRetry(attempts);
    }
    return { result, attempts: this.maxAttempts };
  }

  private async invoke(
    request: AgentRuntimeNextRequest,
    traceId: string,
  ): Promise<RuntimeInvocationOutcome> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/interviews/next`, {
        method: 'POST',
        headers: this.headers(traceId),
        body: JSON.stringify(request),
        signal: controller.signal,
        redirect: 'error',
      });
      if (!response.ok) return httpFailure(response.status);
      return await parseRuntimeDecision(response);
    } catch {
      const code = controller.signal.aborted
        ? 'AGENT_RUNTIME_TIMEOUT'
        : 'AGENT_RUNTIME_NETWORK_ERROR';
      return unavailableFailure(code);
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
    if (this.fallbackEnabled && input.failure.kind !== 'rejected') {
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

  private async waitBeforeRetry(attempt: number) {
    const exponential = this.retryBaseMs * RETRY_MULTIPLIER ** (attempt - 1);
    const jitter = Math.floor(Math.random() * this.retryBaseMs);
    const delayMs = Math.min(exponential + jitter, MAX_RETRY_DELAY_MS);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

function elapsed(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}
