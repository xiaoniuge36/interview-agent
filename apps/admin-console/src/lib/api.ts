import {
  ApiError,
  normalizeBaseUrl,
  requestApiBlob,
  requestApiJson,
  type ApiClientConfig,
  type ApiErrorOptions,
  type ApiRequestDependencies,
  type DownloadedApiFile,
} from '@interview-agent/api-client';
import type { ZodType } from 'zod';
import { authClient } from './auth';

const DEFAULT_API_BASE = 'http://localhost:7101/api';
const API_BASE = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE);
const HTTP_UNAUTHORIZED = 401;
const ADMIN_API_ERROR_EVENT = 'admin-api-error';

export type AdminApiRequest<T> = {
  path: string;
  schema: ZodType<T>;
  init?: RequestInit;
};

export type AdminApiBlobRequest = {
  path: string;
  fallbackFileName: string;
  init?: RequestInit;
};

export type AdminDownloadedFile = DownloadedApiFile;
export type AdminApiDependencies = ApiRequestDependencies;
export type AdminApiErrorOptions = ApiErrorOptions;

export class AdminApiError extends ApiError {
  constructor(options: AdminApiErrorOptions) {
    super(options);
    this.name = 'AdminApiError';
  }
}

const ADMIN_API_CONFIG: ApiClientConfig = {
  createError: (options) => new AdminApiError(options),
  messages: {
    invalidResponse: 'Product API 响应不符合管理端数据契约。',
    invalidJson: 'Product API 返回了无效 JSON。',
    invalidErrorEnvelope: 'Product API 错误响应不符合统一错误契约。',
    network: '无法连接 Product API，请检查网络后重试。',
    invalidPath: 'API 路径必须是站内绝对路径。',
  },
  mapAuthHeadersError: (cause) =>
    new AdminApiError({
      message: cause instanceof Error ? cause.message : '登录状态已失效。',
      code: 'AUTH_REQUIRED',
      status: HTTP_UNAUTHORIZED,
      cause,
    }),
};

export function isAdminSessionExpired(error: unknown): boolean {
  return error instanceof AdminApiError && error.status === HTTP_UNAUTHORIZED;
}

export function subscribeAdminApiErrors(listener: (error: AdminApiError) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => {
    const error = (event as CustomEvent<unknown>).detail;
    if (error instanceof AdminApiError) listener(error);
  };
  window.addEventListener(ADMIN_API_ERROR_EVENT, handler);
  return () => window.removeEventListener(ADMIN_API_ERROR_EVENT, handler);
}

const DEFAULT_DEPENDENCIES: AdminApiDependencies = {
  baseUrl: API_BASE,
  getAuthHeaders: () => authClient.getRequestHeaders(),
  fetch: (...args) => globalThis.fetch(...args),
};

export function adminRequest<T>(request: AdminApiRequest<T>): Promise<T> {
  return reportAdminApiFailure(() => requestAdminJson(request, DEFAULT_DEPENDENCIES));
}

export function adminDownload(request: AdminApiBlobRequest): Promise<AdminDownloadedFile> {
  return reportAdminApiFailure(() => requestAdminBlob(request, DEFAULT_DEPENDENCIES));
}

export function requestAdminJson<T>(
  request: AdminApiRequest<T>,
  dependencies: AdminApiDependencies,
): Promise<T> {
  return requestApiJson(ADMIN_API_CONFIG, request, dependencies);
}

export function requestAdminBlob(
  request: AdminApiBlobRequest,
  dependencies: AdminApiDependencies,
): Promise<AdminDownloadedFile> {
  return requestApiBlob(ADMIN_API_CONFIG, request, dependencies);
}

async function reportAdminApiFailure<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof AdminApiError) emitAdminApiError(error);
    throw error;
  }
}

function emitAdminApiError(error: AdminApiError): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ADMIN_API_ERROR_EVENT, { detail: error }));
}
