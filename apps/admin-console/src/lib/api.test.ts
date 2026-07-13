import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import {
  AdminApiError,
  requestAdminJson,
  type AdminApiDependencies,
  type AdminApiRequest,
} from './api';

const PayloadSchema = z.object({ value: z.string() });
const BASE_URL = 'https://api.example.test';

function request(): AdminApiRequest<z.infer<typeof PayloadSchema>> {
  return { path: '/admin/payload', schema: PayloadSchema };
}

function dependencies(response: Response): AdminApiDependencies {
  return {
    baseUrl: BASE_URL,
    getAuthHeaders: async () => new Headers({ 'x-development-actor': 'admin' }),
    fetch: vi.fn(async () => response) as typeof fetch,
  };
}

function errorEnvelope(code: string, message: string) {
  return {
    error: { code, message },
    requestId: 'request-12345678',
    traceId: 'trace-12345678',
    timestamp: '2026-07-10T00:00:00.000Z',
  };
}

describe('requestAdminJson successful responses', () => {
  it('携带认证头并校验成功响应', async () => {
    const deps = dependencies(Response.json({ value: 'ok' }));
    await expect(requestAdminJson(request(), deps)).resolves.toEqual({
      value: 'ok',
    });
    const init = vi.mocked(deps.fetch).mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get('x-development-actor')).toBe('admin');
    expect(new Headers(init?.headers).get('Accept')).toBe('application/json');
  });

  it('拒绝不符合契约的成功响应', async () => {
    const deps = dependencies(Response.json({ value: 1 }));
    await expect(requestAdminJson(request(), deps)).rejects.toMatchObject({
      code: 'INVALID_API_RESPONSE',
    });
  });
});

describe('requestAdminJson error responses', () => {
  it('解析统一错误 envelope 并保留 requestId', async () => {
    const response = Response.json(errorEnvelope('FORBIDDEN', '无权访问'), {
      status: 403,
    });
    const error = await requestAdminJson(request(), dependencies(response)).catch(
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
      requestId: 'request-12345678',
    });
  });

  it('拒绝无效 JSON 响应', async () => {
    const response = new Response('{invalid', {
      headers: { 'Content-Type': 'application/json' },
    });
    await expect(requestAdminJson(request(), dependencies(response))).rejects.toMatchObject({
      code: 'INVALID_JSON_RESPONSE',
    });
  });

  it.each([401, 403])('保留 HTTP %s 认证授权状态', async (status) => {
    const response = Response.json(errorEnvelope('ACCESS_DENIED', '访问被拒绝'), {
      status,
    });
    await expect(requestAdminJson(request(), dependencies(response))).rejects.toMatchObject({
      status,
      code: 'ACCESS_DENIED',
    });
  });
});

describe('requestAdminJson security boundaries', () => {
  it('拒绝外部与协议相对路径', async () => {
    const deps = dependencies(Response.json({ value: 'ok' }));
    await expect(
      requestAdminJson({ ...request(), path: 'https://outside.test' }, deps),
    ).rejects.toMatchObject({ code: 'INVALID_API_PATH' });
    await expect(
      requestAdminJson({ ...request(), path: '//outside.test' }, deps),
    ).rejects.toMatchObject({ code: 'INVALID_API_PATH' });
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('将认证头获取失败转换为全局 401 错误', async () => {
    const deps = dependencies(Response.json({ value: 'ok' }));
    deps.getAuthHeaders = vi.fn(async () => {
      throw new Error('登录状态已失效');
    });
    await expect(requestAdminJson(request(), deps)).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
      status: 401,
    });
    expect(deps.fetch).not.toHaveBeenCalled();
  });
});
