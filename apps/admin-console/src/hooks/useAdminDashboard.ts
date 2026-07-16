'use client';

import { DashboardSchema, type Dashboard } from '@interview-agent/contracts';
import { useCallback, useEffect, useState } from 'react';
import { AdminApiError, adminRequest } from '@/lib/api';

const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;

export type SectionAccess = 'required' | 'admin-only';
export type SectionState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'forbidden'; access: SectionAccess }
  | { status: 'error'; error: AdminApiError };

export type AdminDashboardState = {
  authenticationError: AdminApiError | null;
  dashboard: SectionState<Dashboard>;
};

type AdminRequests = {
  dashboard: (signal?: AbortSignal) => Promise<Dashboard>;
};

const DEFAULT_REQUESTS: AdminRequests = {
  dashboard: (signal) => request('/admin/dashboard', DashboardSchema, signal),
};

export function useAdminDashboard() {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<AdminDashboardState>(loadingState);
  const [isRefreshing, setRefreshing] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setRefreshing(true);
    void loadAdminDashboard(DEFAULT_REQUESTS, controller.signal)
      .then((next) => {
        if (active) {
          setState(next);
          setLastUpdatedAt(new Date().toISOString());
        }
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  return { state, isRefreshing, lastUpdatedAt, reload };
}

export async function loadAdminDashboard(
  requests: AdminRequests,
  signal?: AbortSignal,
): Promise<AdminDashboardState> {
  const results = await Promise.allSettled([requests.dashboard(signal)] as const);
  const [dashboard] = results;
  return {
    authenticationError: findAuthenticationError(results),
    dashboard: toSection(dashboard, 'required'),
  };
}

function request<T>(path: string, schema: import('zod').ZodType<T>, signal?: AbortSignal) {
  return adminRequest({
    path,
    schema,
    ...(signal ? { init: { signal } } : {}),
  });
}

function toSection<T>(result: PromiseSettledResult<T>, access: SectionAccess): SectionState<T> {
  if (result.status === 'fulfilled') return { status: 'ready', data: result.value };
  const error = normalizeError(result.reason);
  if (error.status === HTTP_FORBIDDEN) return { status: 'forbidden', access };
  return { status: 'error', error };
}

function findAuthenticationError(
  results: readonly PromiseSettledResult<unknown>[],
): AdminApiError | null {
  for (const result of results) {
    if (result.status === 'rejected') {
      const error = normalizeError(result.reason);
      if (error.status === HTTP_UNAUTHORIZED) return error;
    }
  }
  return null;
}

function normalizeError(error: unknown): AdminApiError {
  if (error instanceof AdminApiError) return error;
  return new AdminApiError({
    message: error instanceof Error ? error.message : '管理端数据加载失败。',
    code: 'UNEXPECTED_ADMIN_ERROR',
    cause: error,
  });
}

function loadingState(): AdminDashboardState {
  return {
    authenticationError: null,
    dashboard: { status: 'loading' },
  };
}
