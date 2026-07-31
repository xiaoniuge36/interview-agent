import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ModelProvider } from '@interview-agent/contracts';
import {
  ModelProviderStreamError,
  providerStreamEvents,
  type ModelTokenUsage,
} from './model-provider-stream';
import { e2eModelStubUrl } from './model-provider-e2e';
import {
  MODEL_PROVIDER_TRANSPORT,
  ModelProviderError,
  providerFetch,
  requestSignal,
  type ProviderTransport,
} from './model-provider-request';
import { compatibleUsageFromResponse } from './model-provider-usage';

export { ModelProviderError } from './model-provider-request';

export type ModelConnection = {
  provider: ModelProvider;
  model: string;
  baseUrl: string | null;
  apiKey: string;
  onUsage?: (usage: ModelTokenUsage) => void;
};

export type ModelRequestLimits = {
  maxOutputTokens?: number;
  timeoutMs?: number;
};

export type ModelCompletionRequest = ModelConnection &
  ModelRequestLimits & {
    systemPrompt: string;
    userPrompt: string;
    signal?: AbortSignal;
    onUsage?: (usage: ModelTokenUsage) => void;
  };

export type CompatibleModelInvocationRequest = ModelConnection &
  ModelRequestLimits & {
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
const DEFAULT_MAX_OUTPUT_TOKENS = 700;
const BYTES_PER_KILOBYTE = 1024;
const MAX_COMPATIBLE_RESPONSE_BYTES = 2 * BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;
const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_OUTPUT_TOKENS = 0;

@Injectable()
export class ModelProviderClient {
  constructor(
    @Optional() @Inject(MODEL_PROVIDER_TRANSPORT) private readonly transport?: ProviderTransport,
  ) {}

  async complete(input: ModelCompletionRequest): Promise<string> {
    let content = '';
    for await (const delta of this.stream(input)) content += delta;
    if (!content) throw new ModelProviderError('MODEL_PROVIDER_RESPONSE_INVALID');
    return content;
  }

  async *stream(input: ModelCompletionRequest): AsyncGenerator<string> {
    const response = await sendProviderRequest(input, this.transport);
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

  async testConnection(input: ModelConnection & ModelRequestLimits): Promise<void> {
    await this.complete({
      ...input,
      systemPrompt: 'Respond with a compact JSON object only.',
      userPrompt: 'Return {"ok":true}.',
    });
  }

  async embed(input: ModelConnection & ModelRequestLimits, texts: string[]): Promise<number[][]> {
    if (input.provider === 'anthropic') {
      throw new ModelProviderError('MODEL_PROVIDER_REQUEST_REJECTED');
    }
    const response = await embeddingRequest(input, texts, this.transport);
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new ModelProviderError(errorCode(response.status));
    const vectors = parseEmbeddingResponse(payload, texts.length);
    const usage = embeddingUsageFromResponse(payload);
    if (usage) input.onUsage?.(usage);
    return vectors;
  }

  async invokeCompatible(
    input: CompatibleModelInvocationRequest,
    onUsage?: (usage: ModelTokenUsage) => void,
  ): Promise<Record<string, unknown>> {
    if (input.provider === 'anthropic') {
      throw new ModelProviderError('MODEL_PROVIDER_REQUEST_REJECTED');
    }
    const endpoint = `${baseUrlFor(input).replace(/\/$/, '')}/chat/completions`;
    const response = await providerFetch(
      endpoint,
      {
        method: 'POST',
        redirect: 'error',
        headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...input.requestBody,
          ...(input.maxOutputTokens === undefined ? {} : { max_tokens: input.maxOutputTokens }),
        }),
        signal: requestSignal(undefined, input.timeoutMs),
      },
      { transport: this.transport, timeoutMs: input.timeoutMs },
    );
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

function embeddingUsageFromResponse(payload: unknown): ModelTokenUsage | null {
  if (!isRecord(payload)) return null;
  const usage = compatibleUsageFromResponse(payload);
  return usage ? { ...usage, outputTokens: EMBEDDING_OUTPUT_TOKENS } : null;
}

async function embeddingRequest(
  input: ModelConnection & ModelRequestLimits,
  texts: string[],
  transport: ProviderTransport | undefined,
) {
  const endpoint = `${baseUrlFor(input).replace(/\/$/, '')}/embeddings`;
  try {
    return await providerFetch(
      endpoint,
      {
        method: 'POST',
        redirect: 'error',
        headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: input.model, input: texts }),
        signal: requestSignal(undefined, input.timeoutMs),
      },
      { transport, timeoutMs: input.timeoutMs },
    );
  } catch (error) {
    if (error instanceof ModelProviderError && error.code === 'MODEL_PROVIDER_TIMEOUT') {
      throw new ModelProviderError('EMBEDDING_TIMEOUT');
    }
    if (error instanceof ModelProviderError) throw error;
    if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) {
      throw new ModelProviderError('EMBEDDING_TIMEOUT');
    }
    throw new ModelProviderError('MODEL_PROVIDER_UNAVAILABLE');
  }
}

async function sendProviderRequest(
  input: ModelCompletionRequest,
  transport: ProviderTransport | undefined,
): Promise<Response> {
  const endpoint = endpointFor(input);
  const response = await providerFetch(
    endpoint,
    { ...requestFor(input), signal: requestSignal(input.signal, input.timeoutMs) },
    { transport, timeoutMs: input.timeoutMs, upstreamSignal: input.signal },
  );
  if (!response.ok) throw new ModelProviderError(errorCode(response.status));
  return response;
}

function endpointFor(input: ModelConnection) {
  const baseUrl = baseUrlFor(input).replace(/\/$/, '');
  return input.provider === 'anthropic' ? `${baseUrl}/messages` : `${baseUrl}/chat/completions`;
}

function baseUrlFor(input: ModelConnection) {
  const e2eStubUrl = e2eModelStubUrl();
  if (e2eStubUrl) return e2eStubUrl;
  if (input.baseUrl) return input.baseUrl;
  if (input.provider === 'openai_compatible')
    throw new ModelProviderError('MODEL_BASE_URL_REQUIRED');
  return DEFAULT_BASE_URLS[input.provider];
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
      max_tokens: input.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
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
      max_tokens: input.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
      temperature: 0.2,
      stream: true,
      messages: [{ role: 'user', content: input.userPrompt }],
    }),
  };
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

function parseEmbeddingResponse(payload: unknown, expectedCount: number): number[][] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new ModelProviderError('MODEL_PROVIDER_RESPONSE_INVALID');
  }
  const vectors = payload.data.map(parseEmbeddingItem);
  if (vectors.length !== expectedCount || vectors.some((vector) => vector === null)) {
    throw new ModelProviderError('MODEL_PROVIDER_RESPONSE_INVALID');
  }
  const ordered = vectors.filter(isEmbeddingItem).sort((left, right) => left.index - right.index);
  if (ordered.some((item, index) => item.index !== index)) {
    throw new ModelProviderError('MODEL_PROVIDER_RESPONSE_INVALID');
  }
  return ordered.map((item) => item.embedding);
}

function parseEmbeddingItem(value: unknown): { index: number; embedding: number[] } | null {
  if (!isRecord(value) || !Number.isInteger(value.index) || !Array.isArray(value.embedding))
    return null;
  const embedding = value.embedding;
  if (
    embedding.length !== EMBEDDING_DIMENSIONS ||
    embedding.some((item) => typeof item !== 'number' || !Number.isFinite(item))
  ) {
    throw new ModelProviderError('EMBEDDING_DIMENSION_INVALID');
  }
  return { index: value.index as number, embedding: embedding as number[] };
}

function isEmbeddingItem(
  value: { index: number; embedding: number[] } | null,
): value is { index: number; embedding: number[] } {
  return value !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorCode(status: number) {
  if (status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN) {
    return 'MODEL_PROVIDER_AUTH_FAILED';
  }
  if (status === HTTP_TOO_MANY_REQUESTS) return 'MODEL_PROVIDER_RATE_LIMITED';
  if (status >= HTTP_SERVER_ERROR) return 'MODEL_PROVIDER_UNAVAILABLE';
  return 'MODEL_PROVIDER_REQUEST_REJECTED';
}
