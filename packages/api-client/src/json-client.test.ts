import { expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, type ApiErrorOptions } from './api-error';
import {
  requestApiBlob,
  requestApiJson,
  type ApiClientConfig,
  type ApiRequestDependencies,
} from './json-client';

const HTTP_BAD_REQUEST = 400;
const RETRY_ATTEMPTS = 2;

const testConfig: ApiClientConfig = {
  createError: (options: ApiErrorOptions) => new ApiError(options),
  messages: {
    invalidResponse: '响应数据格式不正确。',
    invalidJson: '响应不是有效的 JSON。',
    invalidErrorEnvelope: '错误响应格式不正确。',
    network: '网络请求失败。',
    invalidPath: '非法的接口地址。',
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function dependenciesWith(fetchImpl: unknown): ApiRequestDependencies {
  return {
    baseUrl: 'https://api.example.test',
    getAuthHeaders: () => Promise.resolve(new Headers({ Authorization: 'Bearer token-1' })),
    fetch: fetchImpl as typeof fetch,
  };
}

it('parses a successful payload and sends auth plus json headers', async () => {
  const fetchMock = vi.fn(async () => jsonResponse({ greeting: '你好' }));
  const result = await requestApiJson(
    testConfig,
    {
      path: '/api/greeting',
      schema: z.object({ greeting: z.string() }),
      init: { method: 'POST', body: JSON.stringify({ name: '面试官' }) },
    },
    dependenciesWith(fetchMock),
  );
  expect(result).toEqual({ greeting: '你好' });
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://api.example.test/api/greeting');
  const headers = new Headers(init.headers);
  expect(headers.get('Authorization')).toBe('Bearer token-1');
  expect(headers.get('Accept')).toBe('application/json');
  expect(headers.get('Content-Type')).toBe('application/json');
  expect(init.cache).toBe('no-store');
});

it('rejects non-internal paths without calling fetch', async () => {
  const fetchMock = vi.fn();
  await expect(
    requestApiJson(
      testConfig,
      { path: 'https://evil.example/api', schema: z.unknown() },
      dependenciesWith(fetchMock),
    ),
  ).rejects.toMatchObject({ code: 'INVALID_API_PATH' });
  expect(fetchMock).not.toHaveBeenCalled();
});

it('surfaces the backend error envelope as an ApiError', async () => {
  const envelope = {
    error: { code: 'QUESTION_NOT_FOUND', message: '题目不存在。' },
    requestId: 'req-9',
    traceId: 'trace-9',
    timestamp: '2026-08-25T08:00:00.000Z',
  };
  const fetchMock = vi.fn(async () => jsonResponse(envelope, HTTP_BAD_REQUEST));
  await expect(
    requestApiJson(
      testConfig,
      { path: '/api/questions/9', schema: z.unknown() },
      dependenciesWith(fetchMock),
    ),
  ).rejects.toMatchObject({
    code: 'QUESTION_NOT_FOUND',
    message: '题目不存在。',
    status: HTTP_BAD_REQUEST,
    requestId: 'req-9',
  });
});

it('flags malformed error envelopes on failed responses', async () => {
  const badEnvelope = vi.fn(async () => jsonResponse({ oops: true }, HTTP_BAD_REQUEST));
  await expect(
    requestApiJson(
      testConfig,
      { path: '/api/a', schema: z.unknown() },
      dependenciesWith(badEnvelope),
    ),
  ).rejects.toMatchObject({ code: 'INVALID_ERROR_RESPONSE' });
});

it('flags schema mismatches on successful responses', async () => {
  const wrongShape = vi.fn(async () => jsonResponse({ value: 1 }));
  await expect(
    requestApiJson(
      testConfig,
      { path: '/api/b', schema: z.object({ value: z.string() }) },
      dependenciesWith(wrongShape),
    ),
  ).rejects.toMatchObject({ code: 'INVALID_API_RESPONSE' });
});

it('retries idempotent requests on network failure when configured', async () => {
  const retryConfig: ApiClientConfig = { ...testConfig, idempotentNetworkAttempts: RETRY_ATTEMPTS };
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('fetch failed'))
    .mockResolvedValueOnce(jsonResponse({ ok: true }));
  const result = await requestApiJson(
    retryConfig,
    {
      path: '/api/submit',
      schema: z.object({ ok: z.boolean() }),
      init: { headers: { 'Idempotency-Key': 'key-1' } },
    },
    dependenciesWith(fetchMock),
  );
  expect(result).toEqual({ ok: true });
  expect(fetchMock).toHaveBeenCalledTimes(RETRY_ATTEMPTS);
});

it('does not retry without an idempotency key and maps network failures', async () => {
  const retryConfig: ApiClientConfig = { ...testConfig, idempotentNetworkAttempts: RETRY_ATTEMPTS };
  const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
  await expect(
    requestApiJson(
      retryConfig,
      { path: '/api/list', schema: z.unknown() },
      dependenciesWith(fetchMock),
    ),
  ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('maps auth header failures through mapAuthHeadersError', async () => {
  const authConfig: ApiClientConfig = {
    ...testConfig,
    mapAuthHeadersError: () => new ApiError({ message: '登录状态已失效。', code: 'AUTH_REQUIRED' }),
  };
  const fetchMock = vi.fn();
  await expect(
    requestApiJson(
      authConfig,
      { path: '/api/me', schema: z.unknown() },
      {
        baseUrl: 'https://api.example.test',
        getAuthHeaders: () => Promise.reject(new Error('no session')),
        fetch: fetchMock as unknown as typeof fetch,
      },
    ),
  ).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  expect(fetchMock).not.toHaveBeenCalled();
});

it('downloads a blob and resolves the file name from headers', async () => {
  const fetchMock = vi.fn(
    async () =>
      new Response('col1,col2', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': "attachment; filename*=UTF-8''%E5%AF%BC%E5%87%BA.csv",
        },
      }),
  );
  const download = await requestApiBlob(
    testConfig,
    { path: '/api/export', fallbackFileName: 'fallback.csv' },
    dependenciesWith(fetchMock),
  );
  expect(download.fileName).toBe('导出.csv');
  expect(await download.blob.text()).toBe('col1,col2');
  const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(new Headers(init.headers).get('Accept')).toBe('text/csv');
});

it('parses error envelopes on failed downloads', async () => {
  const envelope = {
    error: { code: 'EXPORT_FAILED', message: '导出失败。' },
    requestId: 'req-1',
    traceId: 'trace-1',
    timestamp: '2026-08-25T08:00:00.000Z',
  };
  const fetchMock = vi.fn(async () => jsonResponse(envelope, HTTP_BAD_REQUEST));
  await expect(
    requestApiBlob(
      testConfig,
      { path: '/api/export', fallbackFileName: 'fallback.csv' },
      dependenciesWith(fetchMock),
    ),
  ).rejects.toMatchObject({ code: 'EXPORT_FAILED' });
});
