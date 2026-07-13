import { ApiErrorEnvelopeSchema } from '@interview-agent/contracts';
import type { ZodType } from 'zod';
import { authClient } from './auth';

const DEFAULT_API_BASE = 'http://localhost:3001/api';
const API_BASE = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE);
const HTTP_UNAUTHORIZED = 401;

export type AdminApiRequest<T> = {
  path: string;
  schema: ZodType<T>;
  init?: RequestInit;
};

export type AdminApiDependencies = {
  baseUrl: string;
  getAuthHeaders: () => Promise<Headers>;
  fetch: typeof fetch;
};

export type AdminApiErrorOptions = {
  message: string;
  code: string;
  status?: number;
  requestId?: string;
  cause?: unknown;
};

export class AdminApiError extends Error {
  readonly code: string;
  readonly status: number | undefined;
  readonly requestId: string | undefined;

  constructor(options: AdminApiErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'AdminApiError';
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
  }
}

const DEFAULT_DEPENDENCIES: AdminApiDependencies = {
  baseUrl: API_BASE,
  getAuthHeaders: () => authClient.getRequestHeaders(),
  fetch: (...args) => globalThis.fetch(...args),
};

export function adminRequest<T>(request: AdminApiRequest<T>): Promise<T> {
  return requestAdminJson(request, DEFAULT_DEPENDENCIES);
}

export async function requestAdminJson<T>(
  request: AdminApiRequest<T>,
  dependencies: AdminApiDependencies,
): Promise<T> {
  assertInternalPath(request.path);
  const headers = await authenticatedHeaders(request.init, dependencies);
  const response = await callApi(request, headers, dependencies);
  const payload = await readJson(response);
  if (!response.ok) throw responseError(response, payload);
  const parsed = request.schema.safeParse(payload);
  if (parsed.success) return parsed.data;
  throw new AdminApiError({
    message: 'Product API 响应不符合管理端数据契约。',
    code: 'INVALID_API_RESPONSE',
    status: response.status,
    cause: parsed.error,
  });
}

async function authenticatedHeaders(
  init: RequestInit | undefined,
  dependencies: AdminApiDependencies,
): Promise<Headers> {
  try {
    const headers = await dependencies.getAuthHeaders();
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    headers.set('Accept', 'application/json');
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  } catch (error) {
    throw authenticationError(error);
  }
}

async function callApi<T>(
  request: AdminApiRequest<T>,
  headers: Headers,
  dependencies: AdminApiDependencies,
): Promise<Response> {
  try {
    return await dependencies.fetch(dependencies.baseUrl + request.path, {
      ...request.init,
      headers,
      cache: 'no-store',
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new AdminApiError({
      message: '无法连接 Product API，请检查网络后重试。',
      code: 'NETWORK_ERROR',
      cause: error,
    });
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new AdminApiError({
      message: 'Product API 返回了无效 JSON。',
      code: 'INVALID_JSON_RESPONSE',
      status: response.status,
      cause: error,
    });
  }
}

function responseError(response: Response, payload: unknown): AdminApiError {
  const envelope = ApiErrorEnvelopeSchema.safeParse(payload);
  if (!envelope.success) {
    return new AdminApiError({
      message: 'Product API 错误响应不符合统一错误契约。',
      code: 'INVALID_ERROR_RESPONSE',
      status: response.status,
      cause: envelope.error,
    });
  }
  return new AdminApiError({
    message: envelope.data.error.message,
    code: envelope.data.error.code,
    status: response.status,
    requestId: envelope.data.requestId,
  });
}

function authenticationError(cause: unknown): AdminApiError {
  return new AdminApiError({
    message: cause instanceof Error ? cause.message : '登录状态已失效。',
    code: 'AUTH_REQUIRED',
    status: HTTP_UNAUTHORIZED,
    cause,
  });
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function assertInternalPath(path: string): void {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new AdminApiError({
      message: 'API 路径必须是站内绝对路径。',
      code: 'INVALID_API_PATH',
    });
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
