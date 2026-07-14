import { ApiErrorEnvelopeSchema } from '@interview-agent/contracts';
import type { ZodType } from 'zod';
import { authClient } from './auth';

const DEFAULT_API_BASE = 'http://localhost:3001/api';
const API_BASE = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE);
const IDEMPOTENT_NETWORK_ATTEMPTS = 2;

export type ApiRequest<T> = {
  path: string;
  schema: ZodType<T>;
  init?: RequestInit;
};

export type ApiDependencies = {
  baseUrl: string;
  getAuthHeaders: () => Promise<Headers>;
  fetch: typeof fetch;
};

export type ApiErrorOptions = {
  message: string;
  code: string;
  status?: number;
  requestId?: string;
  cause?: unknown;
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number | undefined;
  readonly requestId: string | undefined;

  constructor(options: ApiErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
  }
}

const DEFAULT_DEPENDENCIES: ApiDependencies = {
  baseUrl: API_BASE,
  getAuthHeaders: () => authClient.getRequestHeaders(),
  fetch: (...args) => globalThis.fetch(...args),
};

export function apiRequest<T>(request: ApiRequest<T>): Promise<T> {
  return requestJson(request, DEFAULT_DEPENDENCIES);
}

export async function requestJson<T>(
  request: ApiRequest<T>,
  dependencies: ApiDependencies,
): Promise<T> {
  assertInternalPath(request.path);
  const headers = await buildHeaders(request.init, dependencies.getAuthHeaders);
  const response = await fetchWithRetry(request, headers, dependencies);
  const payload = await readJson(response);
  if (!response.ok) throw responseError(response, payload);
  const parsed = request.schema.safeParse(payload);
  if (parsed.success) return parsed.data;
  throw new ApiError({
    message: '训练服务返回的数据不符合预期，请稍后重试。',
    code: 'INVALID_API_RESPONSE',
    status: response.status,
    cause: parsed.error,
  });
}

export async function authorizedHeaders(input?: HeadersInit): Promise<Headers> {
  const headers = await authClient.getRequestHeaders();
  new Headers(input).forEach((value, key) => headers.set(key, value));
  return headers;
}

export function apiUrl(path: string): string {
  assertInternalPath(path);
  return API_BASE + path;
}

export function createIdempotencyKey(scope: string): string {
  return scope + ':' + globalThis.crypto.randomUUID();
}

async function buildHeaders(
  init: RequestInit | undefined,
  getAuthHeaders: () => Promise<Headers>,
): Promise<Headers> {
  const headers = await getAuthHeaders();
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  headers.set('Accept', 'application/json');
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

async function fetchWithRetry<T>(
  request: ApiRequest<T>,
  headers: Headers,
  dependencies: ApiDependencies,
): Promise<Response> {
  const attempts = headers.has('Idempotency-Key') ? IDEMPOTENT_NETWORK_ATTEMPTS : 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await dependencies.fetch(dependencies.baseUrl + request.path, {
        ...request.init,
        headers,
        cache: 'no-store',
      });
    } catch (error) {
      if (isAbortError(error)) throw error;
      if (attempt === attempts) throw networkError(error);
    }
  }
  throw networkError(new Error('请求重试循环意外结束。'));
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ApiError({
      message: '训练服务返回了异常数据，请稍后重试。',
      code: 'INVALID_JSON_RESPONSE',
      status: response.status,
      cause: error,
    });
  }
}

function responseError(response: Response, payload: unknown): ApiError {
  const envelope = ApiErrorEnvelopeSchema.safeParse(payload);
  if (!envelope.success) {
    return new ApiError({
      message: '训练服务返回了异常结果，请稍后重试。',
      code: 'INVALID_ERROR_RESPONSE',
      status: response.status,
      cause: envelope.error,
    });
  }
  return new ApiError({
    message: envelope.data.error.message,
    code: envelope.data.error.code,
    status: response.status,
    requestId: envelope.data.requestId,
  });
}

function networkError(cause: unknown): ApiError {
  return new ApiError({
    message: '暂时无法连接训练服务，请检查网络后重试。',
    code: 'NETWORK_ERROR',
    cause,
  });
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function assertInternalPath(path: string): void {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new ApiError({
      message: '请求地址不符合要求。',
      code: 'INVALID_API_PATH',
    });
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
