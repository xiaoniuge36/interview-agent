import { ApiErrorEnvelopeSchema } from '@interview-agent/contracts';
import type { output, ZodTypeAny } from 'zod';
import { ApiError, isAbortError, type ApiErrorOptions } from './api-error';
import { isInternalApiPath } from './internal-path';
import { resolveDownloadFileName } from './download-file-name';

export type ApiRequestDependencies = {
  baseUrl: string;
  getAuthHeaders: () => Promise<Headers>;
  fetch: typeof fetch;
};

export type ApiRequestDescriptor<TSchema extends ZodTypeAny> = {
  path: string;
  schema: TSchema;
  init?: RequestInit;
};

export type ApiBlobRequestDescriptor = {
  path: string;
  fallbackFileName: string;
  init?: RequestInit;
};

export type DownloadedApiFile = {
  blob: Blob;
  fileName: string;
};

export type ApiClientMessages = {
  invalidResponse: string;
  invalidJson: string;
  invalidErrorEnvelope: string;
  network: string;
  invalidPath: string;
};

export type ApiClientConfig = {
  createError: (options: ApiErrorOptions) => ApiError;
  messages: ApiClientMessages;
  /** 带 Idempotency-Key 的请求遇到网络错误时的最大尝试次数，默认不重试。 */
  idempotentNetworkAttempts?: number;
  /** 认证头获取失败时的错误转换，默认原样抛出。 */
  mapAuthHeadersError?: (cause: unknown) => Error;
};

type ApiCall = {
  config: ApiClientConfig;
  path: string;
  init: RequestInit | undefined;
  dependencies: ApiRequestDependencies;
};

const BLOB_ACCEPT_HEADER = 'text/csv';

export function assertInternalApiPath(config: ApiClientConfig, path: string): void {
  if (isInternalApiPath(path)) return;
  throw config.createError({ message: config.messages.invalidPath, code: 'INVALID_API_PATH' });
}

export async function requestApiJson<TSchema extends ZodTypeAny>(
  config: ApiClientConfig,
  request: ApiRequestDescriptor<TSchema>,
  dependencies: ApiRequestDependencies,
): Promise<output<TSchema>> {
  assertInternalApiPath(config, request.path);
  const call: ApiCall = { config, path: request.path, init: request.init, dependencies };
  const response = await fetchWithIdempotentRetry(call, await buildApiHeaders(call));
  const payload = await readApiJson(config, response);
  if (!response.ok) throw apiResponseError(config, response, payload);
  const parsed = request.schema.safeParse(payload);
  if (parsed.success) return parsed.data;
  throw config.createError({
    message: config.messages.invalidResponse,
    code: 'INVALID_API_RESPONSE',
    status: response.status,
    cause: parsed.error,
  });
}

export async function requestApiBlob(
  config: ApiClientConfig,
  request: ApiBlobRequestDescriptor,
  dependencies: ApiRequestDependencies,
): Promise<DownloadedApiFile> {
  assertInternalApiPath(config, request.path);
  const init = withAcceptHeader(request.init, BLOB_ACCEPT_HEADER);
  const call: ApiCall = { config, path: request.path, init, dependencies };
  const response = await fetchApiResponse(call, await buildApiHeaders(call));
  if (!response.ok) throw apiResponseError(config, response, await readApiJson(config, response));
  return {
    blob: await response.blob(),
    fileName: resolveDownloadFileName(
      response.headers.get('Content-Disposition'),
      request.fallbackFileName,
    ),
  };
}

function withAcceptHeader(init: RequestInit | undefined, accept: string): RequestInit {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) headers.set('Accept', accept);
  return { ...init, headers };
}

async function buildApiHeaders(call: ApiCall): Promise<Headers> {
  const headers = await resolveAuthHeaders(call);
  new Headers(call.init?.headers).forEach((value, key) => headers.set(key, value));
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (call.init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

async function resolveAuthHeaders(call: ApiCall): Promise<Headers> {
  try {
    return await call.dependencies.getAuthHeaders();
  } catch (cause) {
    if (call.config.mapAuthHeadersError) throw call.config.mapAuthHeadersError(cause);
    throw cause;
  }
}

async function fetchWithIdempotentRetry(call: ApiCall, headers: Headers): Promise<Response> {
  const configuredAttempts = call.config.idempotentNetworkAttempts ?? 1;
  const attempts = headers.has('Idempotency-Key') ? configuredAttempts : 1;
  let lastError: unknown = new Error('请求未能执行。');
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchApiResponse(call, headers);
    } catch (error) {
      if (isAbortError(error) || attempt === attempts) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

async function fetchApiResponse(call: ApiCall, headers: Headers): Promise<Response> {
  try {
    return await call.dependencies.fetch(call.dependencies.baseUrl + call.path, {
      ...call.init,
      headers,
      cache: 'no-store',
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw call.config.createError({
      message: call.config.messages.network,
      code: 'NETWORK_ERROR',
      cause: error,
    });
  }
}

async function readApiJson(config: ApiClientConfig, response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw config.createError({
      message: config.messages.invalidJson,
      code: 'INVALID_JSON_RESPONSE',
      status: response.status,
      cause: error,
    });
  }
}

function apiResponseError(config: ApiClientConfig, response: Response, payload: unknown): ApiError {
  const envelope = ApiErrorEnvelopeSchema.safeParse(payload);
  if (!envelope.success) {
    return config.createError({
      message: config.messages.invalidErrorEnvelope,
      code: 'INVALID_ERROR_RESPONSE',
      status: response.status,
      cause: envelope.error,
    });
  }
  return config.createError({
    message: envelope.data.error.message,
    code: envelope.data.error.code,
    status: response.status,
    requestId: envelope.data.requestId,
  });
}

export type { ApiErrorOptions };
