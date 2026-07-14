import type { Dashboard } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { AdminApiError } from '@/lib/api';
import { loadAdminDashboard } from './useAdminDashboard';

const DASHBOARD: Dashboard = {
  stats: {
    publishedQuestions: 2,
    pendingCandidates: 1,
    activeInterviews: 0,
    reportsReady: 1,
    schemaPassRate: 100,
    avgLatencyMs: 250,
  },
  importPipeline: [
    { stage: 'received', count: 1 },
    { stage: 'processing', count: 0 },
    { stage: 'review', count: 0 },
    { stage: 'published', count: 1 },
    { stage: 'failed', count: 0 },
  ],
  recentRuns: [],
};

function successfulRequests() {
  return {
    dashboard: async () => DASHBOARD,
    imports: async () => [],
    questions: async () => [],
    candidates: async () => [],
    models: async () => [],
    runs: async () => [],
    logs: async () => [],
  };
}

function apiError(status: number) {
  return new AdminApiError({
    message: '访问被拒绝',
    code: 'ACCESS_DENIED',
    status,
  });
}

describe('loadAdminDashboard', () => {
  it('保留独立分区的成功结果', async () => {
    const state = await loadAdminDashboard(successfulRequests());
    expect(state.authenticationError).toBeNull();
    expect(state.dashboard).toMatchObject({ status: 'ready', data: DASHBOARD });
    expect(state.imports).toMatchObject({ status: 'ready', data: [] });
    expect(state.models).toMatchObject({ status: 'ready', data: [] });
  });

  it('将管理员专属接口的 403 映射为仅管理员可见', async () => {
    const requests = successfulRequests();
    requests.models = async () => Promise.reject(apiError(403));
    requests.runs = async () => Promise.reject(apiError(403));
    const state = await loadAdminDashboard(requests);
    expect(state.dashboard.status).toBe('ready');
    expect(state.models).toEqual({ status: 'forbidden', access: 'admin-only' });
    expect(state.runs).toEqual({ status: 'forbidden', access: 'admin-only' });
  });

  it('将必需接口的 403 映射为无权访问', async () => {
    const requests = successfulRequests();
    requests.questions = async () => Promise.reject(apiError(403));
    const state = await loadAdminDashboard(requests);
    expect(state.questions).toEqual({
      status: 'forbidden',
      access: 'required',
    });
  });

  it('任一接口返回 401 时提升为全局认证失败', async () => {
    const requests = successfulRequests();
    requests.dashboard = async () => Promise.reject(apiError(401));
    const state = await loadAdminDashboard(requests);
    expect(state.authenticationError).toMatchObject({ status: 401 });
  });
});
