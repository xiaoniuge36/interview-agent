import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, requestJson, type ApiRequest } from './api';

const PayloadSchema = z.object({ value: z.string() });
const BASE_URL = 'https://api.example.test';

function dependencies(response: Response) {
  return {
    baseUrl: BASE_URL,
    getAuthHeaders: async () => new Headers({ Authorization: 'Bearer test-token' }),
    fetch: vi.fn(async () => response) as typeof fetch,
  };
}

function request(): ApiRequest<typeof PayloadSchema> {
  return { path: '/payload', schema: PayloadSchema };
}

describe('requestJson response handling', () => {
  it('携带认证头并校验成功响应', async () => {
    const deps = dependencies(Response.json({ value: 'ok' }));
    await expect(requestJson(request(), deps)).resolves.toEqual({ value: 'ok' });
    const init = vi.mocked(deps.fetch).mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-token');
  });

  it('拒绝不符合契约的成功响应', async () => {
    const deps = dependencies(Response.json({ value: 1 }));
    await expect(requestJson(request(), deps)).rejects.toMatchObject({
      code: 'INVALID_API_RESPONSE',
    });
  });

  it('解析统一错误 envelope', async () => {
    const payload = {
      error: { code: 'FORBIDDEN', message: '无权访问' },
      requestId: 'request-12345678',
      traceId: 'trace-12345678',
      timestamp: '2026-07-10T00:00:00.000Z',
    };
    const deps = dependencies(Response.json(payload, { status: 403 }));
    const error = await requestJson(request(), deps).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('拒绝无效 JSON 响应', async () => {
    const response = new Response('{invalid', {
      headers: { 'Content-Type': 'application/json' },
    });
    await expect(requestJson(request(), dependencies(response))).rejects.toMatchObject({
      code: 'INVALID_JSON_RESPONSE',
    });
  });
});

describe('requestJson retry behavior', () => {
  it('仅对带幂等键的网络失败执行重试', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(Response.json({ value: 'ok' }));
    const deps = {
      baseUrl: BASE_URL,
      getAuthHeaders: async () => new Headers(),
      fetch: fetchMock as typeof fetch,
    };
    const input = {
      ...request(),
      init: { headers: { 'Idempotency-Key': 'start:12345678' } },
    };
    await expect(requestJson(input, deps)).resolves.toEqual({ value: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('非幂等请求遇到网络错误时不重试', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    const deps = {
      baseUrl: BASE_URL,
      getAuthHeaders: async () => new Headers(),
      fetch: fetchMock as typeof fetch,
    };
    await expect(requestJson(request(), deps)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('遇到 AbortError 时不执行重试', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const fetchMock = vi.fn().mockRejectedValue(abort);
    const deps = {
      baseUrl: BASE_URL,
      getAuthHeaders: async () => new Headers({ 'Idempotency-Key': 'answer:test' }),
      fetch: fetchMock as typeof fetch,
    };
    await expect(requestJson(request(), deps)).rejects.toBe(abort);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('requestJson security boundaries', () => {
  it('拒绝外部或协议相对路径', async () => {
    const deps = dependencies(Response.json({ value: 'ok' }));
    await expect(requestJson({ ...request(), path: '//outside.test' }, deps)).rejects.toMatchObject(
      { code: 'INVALID_API_PATH' },
    );
    expect(deps.fetch).not.toHaveBeenCalled();
  });
});
