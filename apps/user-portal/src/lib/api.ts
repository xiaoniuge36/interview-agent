import {
  ApiError,
  assertInternalApiPath,
  normalizeBaseUrl,
  requestApiJson,
  type ApiClientConfig,
  type ApiErrorOptions,
  type ApiRequestDependencies,
  type ApiRequestDescriptor,
} from '@interview-agent/api-client';
import type { output, ZodTypeAny } from 'zod';
import { authClient } from './auth';

const DEFAULT_API_BASE = 'http://localhost:7101/api';
const API_BASE = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE);
const IDEMPOTENT_NETWORK_ATTEMPTS = 2;
const HTTP_UNAUTHORIZED = 401;
const SESSION_EXPIRED_EVENT = 'user-session-expired';

export type ApiRequest<TSchema extends ZodTypeAny> = ApiRequestDescriptor<TSchema>;
export type ApiDependencies = ApiRequestDependencies;
export { ApiError, type ApiErrorOptions };

const USER_API_CONFIG: ApiClientConfig = {
  createError: (options) => new ApiError(options),
  messages: {
    invalidResponse: '训练服务返回的数据不符合预期，请稍后重试。',
    invalidJson: '训练服务返回了异常数据，请稍后重试。',
    invalidErrorEnvelope: '训练服务返回了异常结果，请稍后重试。',
    network: '暂时无法连接训练服务，请检查网络后重试。',
    invalidPath: '请求地址不符合要求。',
  },
  idempotentNetworkAttempts: IDEMPOTENT_NETWORK_ATTEMPTS,
  // 取令牌失败（AuthRequiredError）统一映射为 401：与服务端过期走同一条全局登出通路
  mapAuthHeadersError: (cause) =>
    new ApiError({
      message: cause instanceof Error ? cause.message : '登录状态已失效，请重新登录。',
      code: 'AUTH_REQUIRED',
      status: HTTP_UNAUTHORIZED,
      cause,
    }),
};

export function isSessionExpiredError(error: unknown): boolean {
  return error instanceof ApiError && error.status === HTTP_UNAUTHORIZED;
}

/** 会话失效是全局状态而非单请求错误：各页面自身的错误态不足以引导用户重新登录。 */
export function subscribeSessionExpiry(listener: (error: ApiError) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => {
    const error = (event as CustomEvent<unknown>).detail;
    if (error instanceof ApiError) listener(error);
  };
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
}

function emitSessionExpiry(error: ApiError): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: error }));
}

async function reportSessionExpiry<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (isSessionExpiredError(error)) emitSessionExpiry(error as ApiError);
    throw error;
  }
}

const DEFAULT_DEPENDENCIES: ApiDependencies = {
  baseUrl: API_BASE,
  getAuthHeaders: () => authClient.getRequestHeaders(),
  fetch: (...args) => globalThis.fetch(...args),
};

export function apiRequest<TSchema extends ZodTypeAny>(
  request: ApiRequest<TSchema>,
): Promise<output<TSchema>> {
  return reportSessionExpiry(() => requestJson(request, DEFAULT_DEPENDENCIES));
}

export function requestJson<TSchema extends ZodTypeAny>(
  request: ApiRequest<TSchema>,
  dependencies: ApiDependencies,
): Promise<output<TSchema>> {
  return requestApiJson(USER_API_CONFIG, request, dependencies);
}

export async function authorizedHeaders(input?: HeadersInit): Promise<Headers> {
  let headers: Headers;
  try {
    headers = await authClient.getRequestHeaders();
  } catch (error) {
    // SSE 等直连调用不经过 apiRequest：令牌失效同样要触发全局登出引导，原错误照常抛给调用方
    emitSessionExpiry(
      new ApiError({
        message: error instanceof Error ? error.message : '登录状态已失效，请重新登录。',
        code: 'AUTH_REQUIRED',
        status: HTTP_UNAUTHORIZED,
        cause: error,
      }),
    );
    throw error;
  }
  new Headers(input).forEach((value, key) => headers.set(key, value));
  return headers;
}

export function apiUrl(path: string): string {
  assertInternalApiPath(USER_API_CONFIG, path);
  return API_BASE + path;
}

export function createIdempotencyKey(scope: string): string {
  return scope + ':' + globalThis.crypto.randomUUID();
}
