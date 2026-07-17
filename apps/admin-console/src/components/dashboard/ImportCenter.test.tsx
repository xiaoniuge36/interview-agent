import { createElement } from 'react';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ImportCenter } from './ImportCenter';

vi.mock('@/hooks/useAdminPagedList', () => ({
  useAdminPagedList: () => ({
    state: {
      status: 'ready',
      data: {
        items: [
          {
            id: 'import-1',
            tenantId: 'tenant-1',
            assetId: 'asset-1',
            title: 'Java 面试资料.md',
            status: 'review',
            candidateCount: 6,
            candidateReviewProgress: {
              pending: 2,
              needsEdit: 1,
              approved: 1,
              rejected: 1,
              published: 1,
            },
            failureReason: null,
            createdAt: '2026-07-17T00:00:00.000Z',
            updatedAt: '2026-07-17T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      },
    },
    draftQuery: {},
    submittedQuery: {},
    isInitialQueryPending: false,
    isLoading: false,
    setDraftQuery: () => undefined,
    query: () => undefined,
    reset: () => undefined,
    setPage: () => undefined,
    setPageSize: () => undefined,
    reload: () => undefined,
  }),
}));

vi.mock('@/hooks/useAdminListExport', () => ({
  useAdminListExport: () => ({ exportList: async () => undefined, isExporting: false }),
}));

vi.stubGlobal('React', React);

describe('ImportCenter', () => {
  it('shows every candidate review outcome in the import task table', () => {
    const markup = renderToStaticMarkup(
      createElement(ImportCenter, {
        active: true,
        dashboard: { status: 'loading' },
        refreshKey: 0,
        onChanged: () => undefined,
        onNavigate: () => undefined,
      }),
    );

    expect(markup).toContain('审核进度');
    expect(markup).toContain('共 6 题');
    expect(markup).toContain('待审 2');
    expect(markup).toContain('需修改 1');
    expect(markup).toContain('已通过 1');
    expect(markup).toContain('已驳回 1');
    expect(markup).toContain('已发布 1');
  });
});
