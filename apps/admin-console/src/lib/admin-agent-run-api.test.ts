import { describe, expect, it, vi } from 'vitest';
import { requestAdminJson, type AdminApiDependencies } from './api';
import { createAdminListQueryRequest } from './admin-list-api';

const AGENT_RUN_DETAIL = {
  id: 'run-1',
  sessionId: 'session-1',
  type: 'mock_interview',
  status: 'succeeded',
  stage: 'tech_basics',
  traceId: 'trace-12345678',
  latencyMs: 9126,
  schemaValid: true,
  fallbackUsed: false,
  attemptCount: 1,
  updatedAt: '2026-07-17T07:31:04.321Z',
  tenant: { id: 'tenant-1', name: 'Niu 的个人空间' },
  user: { id: 'user-1', name: 'Niu', email: 'niu@example.com' },
  sessionTitle: '全栈开发工程师面试训练',
  command: 'answer',
  modelUsage: {
    provider: 'openai_compatible',
    model: 'zai-org/GLM-5.2',
    invocationCount: 1,
    inputTokens: 900,
    outputTokens: 334,
    cacheReadTokens: 120,
    reasoningTokens: 80,
    totalTokens: 1234,
    latencyMs: 8400,
  },
} as const;

describe('Agent run admin API', () => {
  it('loads all statuses by default', () => {
    const request = createAdminListQueryRequest('agent-runs');
    expect(request.path).toBe('/admin/agent-runs/query?page=1&pageSize=20');
  });

  it('preserves user and model usage details from the API', async () => {
    const result = await requestAdminJson(
      createAdminListQueryRequest('agent-runs'),
      dependencies(Response.json({ items: [AGENT_RUN_DETAIL], total: 1, page: 1, pageSize: 20 })),
    );
    expect(result).toEqual({ items: [AGENT_RUN_DETAIL], total: 1, page: 1, pageSize: 20 });
  });
});

function dependencies(response: Response): AdminApiDependencies {
  return {
    baseUrl: 'https://api.example.test',
    getAuthHeaders: async () => new Headers({ Authorization: 'Bearer session-token' }),
    fetch: vi.fn(async () => response) as typeof fetch,
  };
}
