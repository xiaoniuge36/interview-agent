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
};

const DEFAULT_DEPENDENCIES: ApiDependencies = {
  baseUrl: API_BASE,
  getAuthHeaders: () => authClient.getRequestHeaders(),
  fetch: (...args) => globalThis.fetch(...args),
};

export function apiRequest<TSchema extends ZodTypeAny>(
  request: ApiRequest<TSchema>,
): Promise<output<TSchema>> {
  return requestJson(request, DEFAULT_DEPENDENCIES);
}

export function requestJson<TSchema extends ZodTypeAny>(
  request: ApiRequest<TSchema>,
  dependencies: ApiDependencies,
): Promise<output<TSchema>> {
  return requestApiJson(USER_API_CONFIG, request, dependencies);
}

export async function authorizedHeaders(input?: HeadersInit): Promise<Headers> {
  const headers = await authClient.getRequestHeaders();
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
