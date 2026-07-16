import type { ImportTask } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { AdminApiError } from '@/lib/api';
import {
  createAdminListPageQuery,
  createAdminListSearchQuery,
  resolveAdminPagedList,
  shouldRequestAdminList,
} from './useAdminPagedList';

const PAGE = {
  items: [
    {
      id: 'import-1',
      tenantId: 'tenant-1',
      assetId: 'asset-1',
      title: 'Architecture notes',
      status: 'review',
      candidateCount: 2,
      failureReason: null,
      createdAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T01:00:00.000Z',
    } satisfies ImportTask,
  ],
  total: 21,
  page: 2,
  pageSize: 20,
};

describe('admin paged-list query transitions', () => {
  it('uses the draft filters only after an explicit search and returns to page one', () => {
    expect(
      createAdminListSearchQuery('imports', {
        keyword: 'architecture',
        status: 'review',
        page: 4,
        pageSize: 50,
      }),
    ).toEqual({ keyword: 'architecture', status: 'review', page: 1, pageSize: 50 });
  });

  it('keeps submitted filters when users navigate between server pages', () => {
    expect(
      createAdminListPageQuery(
        'imports',
        { keyword: 'architecture', status: 'review', page: 1, pageSize: 20 },
        3,
      ),
    ).toEqual({ keyword: 'architecture', status: 'review', page: 3, pageSize: 20 });
  });

  it('does not request a list before a changed initial filter has reached submitted state', () => {
    expect(shouldRequestAdminList(true, true)).toBe(false);
    expect(shouldRequestAdminList(true, false)).toBe(true);
    expect(shouldRequestAdminList(false, false)).toBe(false);
  });
});

describe('admin paged-list result handling', () => {
  it('exposes a successful server page as a ready state', async () => {
    await expect(resolveAdminPagedList(() => Promise.resolve(PAGE), 'required')).resolves.toEqual({
      status: 'ready',
      data: PAGE,
    });
  });

  it('keeps access denials distinct from ordinary list errors', async () => {
    const forbidden = new AdminApiError({
      message: 'No access',
      code: 'ACCESS_DENIED',
      status: 403,
    });
    await expect(
      resolveAdminPagedList<ImportTask>(() => Promise.reject(forbidden), 'admin-only'),
    ).resolves.toEqual({ status: 'forbidden', access: 'admin-only' });
  });
});
