import { Injectable } from '@nestjs/common';
import type { ModelProvider } from '@interview-agent/contracts';

export type ModelConnection = {
  provider: ModelProvider;
  model: string;
  baseUrl: string | null;
  apiKey: string;
};

export type ModelCompletionRequest = ModelConnection & {
  systemPrompt: string;
  userPrompt: string;
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

@Injectable()
export class ModelProviderClient {
  async complete(input: ModelCompletionRequest): Promise<string> {
    const response = await sendProviderRequest(input);
    const payload = await response.json().catch(() => null);
    const content = input.provider === 'anthropic' ? anthropicContent(payload) : compatibleContent(payload);
    if (!content) throw new ModelProviderError('MODEL_PROVIDER_RESPONSE_INVALID');
    return content;
  }

  async testConnection(input: ModelConnection): Promise<void> {
    await this.complete({
      ...input,
      systemPrompt: 'Respond with a compact JSON object only.',
      userPrompt: 'Return {"ok":true}.',
    });
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
    signal: AbortSignal.timeout(MODEL_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new ModelProviderError(errorCode(response.status));
  return response;
}

function endpointFor(input: ModelConnection) {
  const baseUrl = baseUrlFor(input).replace(/\/$/, '');
  return input.provider === 'anthropic' ? `${baseUrl}/messages` : `${baseUrl}/chat/completions`;
}

function baseUrlFor(input: ModelConnection) {
  if (input.baseUrl) return input.baseUrl;
  if (input.provider === 'openai_compatible') throw new ModelProviderError('MODEL_BASE_URL_REQUIRED');
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
      max_tokens: 700,
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
      messages: [{ role: 'user', content: input.userPrompt }],
    }),
  };
}

function compatibleContent(payload: unknown) {
  if (!isRecord(payload)) return null;
  const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
  if (!isRecord(choice) || !isRecord(choice.message)) return null;
  return typeof choice.message.content === 'string' ? choice.message.content : null;
}

function anthropicContent(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.content)) return null;
  const text = payload.content.find((item) => isRecord(item) && item.type === 'text');
  return isRecord(text) && typeof text.text === 'string' ? text.text : null;
}

function errorCode(status: number) {
  if (status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN) {
    return 'MODEL_PROVIDER_AUTH_FAILED';
  }
  if (status === HTTP_TOO_MANY_REQUESTS) return 'MODEL_PROVIDER_RATE_LIMITED';
  if (status >= HTTP_SERVER_ERROR) return 'MODEL_PROVIDER_UNAVAILABLE';
  return 'MODEL_PROVIDER_REQUEST_REJECTED';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
