import type { ImportTask } from '@interview-agent/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  AdminApiError,
  requestAdminBlob,
  requestAdminJson,
  type AdminApiDependencies,
} from './api';
import { createAdminListExportRequest, createAdminListQueryRequest } from './admin-list-api';

const BASE_URL = 'https://api.example.test';

const IMPORT_TASK = {
  id: 'import-1',
  tenantId: 'tenant-1',
  assetId: 'asset-1',
  title: 'Architecture notes',
  status: 'review',
  candidateCount: 2,
  failureReason: null,
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T01:00:00.000Z',
} satisfies ImportTask;

function dependencies(response: Response): AdminApiDependencies {
  return {
    baseUrl: BASE_URL,
    getAuthHeaders: async () => new Headers({ Authorization: 'Bearer session-token' }),
    fetch: vi.fn(async () => response) as typeof fetch,
  };
}

function errorEnvelope(code: string, message: string) {
  return {
    error: { code, message },
    requestId: 'request-12345678',
    traceId: 'trace-12345678',
    timestamp: '2026-07-15T00:00:00.000Z',
  };
}

describe('admin list requests', () => {
  it('serializes normalized filters and server pagination for a query request', () => {
    const request = createAdminListQueryRequest('questions', {
      keyword: '  architecture  ',
      status: 'published',
      difficulty: 'hard',
      page: 2,
      pageSize: 50,
    });

    expect(request.path).toBe(
      '/admin/questions/query?page=2&pageSize=50&keyword=architecture&status=published&difficulty=hard',
    );
  });

  it('keeps export scope to submitted filters instead of a single visible page', () => {
    const request = createAdminListExportRequest('candidates', {
      keyword: '  React  ',
      status: 'pending',
      importTaskId: 'import-1',
      page: 4,
      pageSize: 50,
    });

    expect(request.path).toBe(
      '/admin/candidates/export?keyword=React&status=pending&importTaskId=import-1',
    );
    expect(request.fallbackFileName).toBe('candidates.csv');
  });

  it('uses the resource page schema when parsing a server response', async () => {
    const request = createAdminListQueryRequest('imports', { status: 'review', page: 3 });
    const result = await requestAdminJson(
      request,
      dependencies(
        Response.json({
          items: [IMPORT_TASK],
          total: 41,
          page: 3,
          pageSize: 20,
        }),
      ),
    );

    expect(result).toEqual({
      items: [IMPORT_TASK],
      total: 41,
      page: 3,
      pageSize: 20,
    });
  });
});

describe('authenticated admin file downloads', () => {
  it('downloads a CSV blob with auth headers and a UTF-8 attachment filename', async () => {
    const deps = dependencies(
      new Response('id,title\r\n1,Architecture', {
        headers: {
          'Content-Disposition':
            "attachment; filename*=UTF-8''%E5%AE%A1%E6%A0%B8%E9%A2%98%E7%9B%AE.csv",
          'Content-Type': 'text/csv; charset=utf-8',
        },
      }),
    );

    const download = await requestAdminBlob(
      { path: '/admin/questions/export', fallbackFileName: 'questions.csv' },
      deps,
    );

    expect(download.fileName).toBe('审核题目.csv');
    await expect(download.blob.text()).resolves.toBe('id,title\r\n1,Architecture');
    const init = vi.mocked(deps.fetch).mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer session-token');
    expect(new Headers(init?.headers).get('Accept')).toBe('text/csv');
  });

  it('uses a quoted Content-Disposition filename when no RFC 5987 name is present', async () => {
    const download = await requestAdminBlob(
      { path: '/admin/questions/export', fallbackFileName: 'questions.csv' },
      dependencies(
        new Response('id,title', {
          headers: { 'Content-Disposition': 'attachment; filename="question-export.csv"' },
        }),
      ),
    );

    expect(download.fileName).toBe('question-export.csv');
  });

  it('falls back to a safe filename and preserves API errors for failed downloads', async () => {
    const unsafeName = await requestAdminBlob(
      { path: '/admin/questions/export', fallbackFileName: 'questions.csv' },
      dependencies(
        new Response('id,title', {
          headers: { 'Content-Disposition': 'attachment; filename="../questions.csv"' },
        }),
      ),
    );
    expect(unsafeName.fileName).toBe('questions.csv');

    const failed = requestAdminBlob(
      { path: '/admin/questions/export', fallbackFileName: 'questions.csv' },
      dependencies(Response.json(errorEnvelope('ACCESS_DENIED', 'Access denied'), { status: 403 })),
    );
    await expect(failed).rejects.toBeInstanceOf(AdminApiError);
    await expect(failed).rejects.toMatchObject({ code: 'ACCESS_DENIED', status: 403 });
  });
});
