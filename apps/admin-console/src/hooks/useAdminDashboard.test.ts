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
  it('只保留治理总览结果，列表由独立服务端分页 Hook 加载', async () => {
    const state = await loadAdminDashboard(successfulRequests());
    expect(state.authenticationError).toBeNull();
    expect(state.dashboard).toMatchObject({ status: 'ready', data: DASHBOARD });
  });

  it('将治理总览的 403 映射为无权访问', async () => {
    const requests = successfulRequests();
    requests.dashboard = async () => Promise.reject(apiError(403));
    const state = await loadAdminDashboard(requests);
    expect(state.dashboard).toEqual({
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
