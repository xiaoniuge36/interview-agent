'use client';

import {
  AgentRunListSchema,
  AuditLogListSchema,
  CandidateReviewListSchema,
  DashboardSchema,
  ModelProfileListSchema,
  QuestionListSchema,
  type AgentRunView,
  type AuditLogView,
  type CandidateReview,
  type Dashboard,
  type ModelProfile,
  type Question,
} from '@interview-agent/contracts';
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
  questions: SectionState<Question[]>;
  candidates: SectionState<CandidateReview[]>;
  models: SectionState<ModelProfile[]>;
  runs: SectionState<AgentRunView[]>;
  logs: SectionState<AuditLogView[]>;
};

type AdminRequests = {
  dashboard: (signal?: AbortSignal) => Promise<Dashboard>;
  questions: (signal?: AbortSignal) => Promise<Question[]>;
  candidates: (signal?: AbortSignal) => Promise<CandidateReview[]>;
  models: (signal?: AbortSignal) => Promise<ModelProfile[]>;
  runs: (signal?: AbortSignal) => Promise<AgentRunView[]>;
  logs: (signal?: AbortSignal) => Promise<AuditLogView[]>;
};

const DEFAULT_REQUESTS: AdminRequests = {
  dashboard: (signal) => request('/admin/dashboard', DashboardSchema, signal),
  questions: (signal) => request('/admin/questions', QuestionListSchema, signal),
  candidates: (signal) => request('/admin/candidates', CandidateReviewListSchema, signal),
  models: (signal) => request('/admin/model-profiles', ModelProfileListSchema, signal),
  runs: (signal) => request('/admin/agent-runs', AgentRunListSchema, signal),
  logs: (signal) => request('/admin/audit-logs', AuditLogListSchema, signal),
};

export function useAdminDashboard() {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<AdminDashboardState>(loadingState);
  const [isRefreshing, setRefreshing] = useState(true);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setRefreshing(true);
    void loadAdminDashboard(DEFAULT_REQUESTS, controller.signal)
      .then((next) => {
        if (active) setState(next);
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  return { state, isRefreshing, reload };
}

export async function loadAdminDashboard(
  requests: AdminRequests,
  signal?: AbortSignal,
): Promise<AdminDashboardState> {
  const results = await Promise.allSettled([
    requests.dashboard(signal),
    requests.questions(signal),
    requests.candidates(signal),
    requests.models(signal),
    requests.runs(signal),
    requests.logs(signal),
  ] as const);
  const [dashboard, questions, candidates, models, runs, logs] = results;
  return {
    authenticationError: findAuthenticationError(results),
    dashboard: toSection(dashboard, 'required'),
    questions: toSection(questions, 'required'),
    candidates: toSection(candidates, 'required'),
    models: toSection(models, 'admin-only'),
    runs: toSection(runs, 'admin-only'),
    logs: toSection(logs, 'admin-only'),
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
    questions: { status: 'loading' },
    candidates: { status: 'loading' },
    models: { status: 'loading' },
    runs: { status: 'loading' },
    logs: { status: 'loading' },
  };
}
