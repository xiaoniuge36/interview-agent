import { Injectable } from '@nestjs/common';
import type { ModelProvider } from '@interview-agent/contracts';
import {
  ModelProviderStreamError,
  providerStreamEvents,
  type ModelTokenUsage,
} from './model-provider-stream';

export type ModelConnection = {
  provider: ModelProvider;
  model: string;
  baseUrl: string | null;
  apiKey: string;
  onUsage?: (usage: ModelTokenUsage) => void;
};

export type ModelCompletionRequest = ModelConnection & {
  systemPrompt: string;
  userPrompt: string;
  signal?: AbortSignal;
  onUsage?: (usage: ModelTokenUsage) => void;
};

export type CompatibleModelInvocationRequest = ModelConnection & {
  requestBody: Record<string, unknown>;
};

const DEFAULT_BASE_URLS: Record<Exclude<ModelProvider, 'openai_compatible'>, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
};
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;
const MODEL_REQUEST_TIMEOUT_MS = 30_000;
const BYTES_PER_KILOBYTE = 1024;
const MAX_COMPATIBLE_RESPONSE_BYTES = 2 * BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;

@Injectable()
export class ModelProviderClient {
  async complete(input: ModelCompletionRequest): Promise<string> {
    let content = '';
    for await (const delta of this.stream(input)) content += delta;
    if (!content) throw new ModelProviderError('MODEL_PROVIDER_RESPONSE_INVALID');
    return content;
  }

  async *stream(input: ModelCompletionRequest): AsyncGenerator<string> {
    const response = await sendProviderRequest(input);
    try {
      for await (const event of providerStreamEvents(response.body, input.provider)) {
        if (event.type === 'usage') input.onUsage?.(event.value);
        if (event.type === 'text') yield event.value;
      }
    } catch (error) {
      if (error instanceof ModelProviderStreamError) throw new ModelProviderError(error.code);
      throw error;
    }
  }

  async testConnection(input: ModelConnection): Promise<void> {
    await this.complete({
      ...input,
      systemPrompt: 'Respond with a compact JSON object only.',
      userPrompt: 'Return {"ok":true}.',
    });
  }

  async invokeCompatible(
    input: CompatibleModelInvocationRequest,
    onUsage?: (usage: ModelTokenUsage) => void,
  ): Promise<Record<string, unknown>> {
    if (input.provider === 'anthropic') {
      throw new ModelProviderError('MODEL_PROVIDER_REQUEST_REJECTED');
    }
    const response = await fetch(`${baseUrlFor(input).replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      redirect: 'error',
      headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input.requestBody),
      signal: requestSignal(undefined),
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new ModelProviderError(errorCode(response.status));
    if (!isRecord(payload) || !Array.isArray(payload.choices)) {
      throw new ModelProviderError('MODEL_PROVIDER_RESPONSE_INVALID');
    }
    const usage = compatibleUsageFromResponse(payload);
    if (usage) onUsage?.(usage);
    return payload;
  }
}

export class ModelProviderError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = ModelProviderError.name;
  }
}

async function sendProviderRequest(input: ModelCompletionRequest): Promise<Response> {
  const response = await fetch(endpointFor(input), {
    ...requestFor(input),
    signal: requestSignal(input.signal),
  });
  if (!response.ok) throw new ModelProviderError(errorCode(response.status));
  return response;
}

function endpointFor(input: ModelConnection) {
  const baseUrl = baseUrlFor(input).replace(/\/$/, '');
  return input.provider === 'anthropic' ? `${baseUrl}/messages` : `${baseUrl}/chat/completions`;
}

function baseUrlFor(input: ModelConnection) {
  const e2eStubUrl = testStubUrl();
  if (e2eStubUrl) return e2eStubUrl;
  if (input.baseUrl) return input.baseUrl;
  if (input.provider === 'openai_compatible')
    throw new ModelProviderError('MODEL_BASE_URL_REQUIRED');
  return DEFAULT_BASE_URLS[input.provider];
}

function testStubUrl(): string | null {
  if (process.env.NODE_ENV !== 'test') return null;
  const value = process.env.E2E_MODEL_STUB_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['127.0.0.1', '::1', 'localhost'].includes(url.hostname)) return null;
    return value;
  } catch {
    return null;
  }
}

function requestFor(input: ModelCompletionRequest): RequestInit {
  return input.provider === 'anthropic' ? anthropicRequest(input) : compatibleRequest(input);
}

function compatibleRequest(input: ModelCompletionRequest): RequestInit {
  return {
    method: 'POST',
    redirect: 'error',
    headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: input.model,
      temperature: 0.2,
      max_tokens: 700,
      stream: true,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt },
      ],
    }),
  };
}

function anthropicRequest(input: ModelCompletionRequest): RequestInit {
  return {
    method: 'POST',
    redirect: 'error',
    headers: {
      'x-api-key': input.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      system: input.systemPrompt,
      max_tokens: 700,
      temperature: 0.2,
      stream: true,
      messages: [{ role: 'user', content: input.userPrompt }],
    }),
  };
}

function requestSignal(signal: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(MODEL_REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > MAX_COMPATIBLE_RESPONSE_BYTES) {
    throw new ModelProviderError('MODEL_PROVIDER_RESPONSE_INVALID');
  }
  try {
    return body ? JSON.parse(body) : null;
  } catch {
    throw new ModelProviderError('MODEL_PROVIDER_RESPONSE_INVALID');
  }
}

function compatibleUsageFromResponse(payload: Record<string, unknown>): ModelTokenUsage | null {
  const usage = payload.usage;
  if (!isRecord(usage)) return null;
  const promptTokens = numberValue(usage.prompt_tokens);
  const outputTokens = numberValue(usage.completion_tokens);
  const totalTokens = numberValue(usage.total_tokens);
  const promptDetails = isRecord(usage.prompt_tokens_details) ? usage.prompt_tokens_details : {};
  const completionDetails = isRecord(usage.completion_tokens_details)
    ? usage.completion_tokens_details
    : {};
  const cacheReadTokens = numberValue(promptDetails.cached_tokens);
  const reasoningTokens = numberValue(completionDetails.reasoning_tokens);
  const result: ModelTokenUsage = {
    ...(promptTokens === undefined ? {} : { inputTokens: promptTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
    ...(cacheReadTokens === undefined ? {} : { cacheReadTokens }),
    ...(reasoningTokens === undefined ? {} : { reasoningTokens }),
    ...(totalTokens === undefined ? {} : { totalTokens }),
  };
  return Object.keys(result).length > 0 ? result : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function errorCode(status: number) {
  if (status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN) {
    return 'MODEL_PROVIDER_AUTH_FAILED';
  }
  if (status === HTTP_TOO_MANY_REQUESTS) return 'MODEL_PROVIDER_RATE_LIMITED';
  if (status >= HTTP_SERVER_ERROR) return 'MODEL_PROVIDER_UNAVAILABLE';
  return 'MODEL_PROVIDER_REQUEST_REJECTED';
}
