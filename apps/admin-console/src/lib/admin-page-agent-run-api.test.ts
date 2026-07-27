import { describe, expect, it } from 'vitest';
import {
  AdminAgentRunSchema,
  createAdminAgentCompleteRunRequest,
  createAdminAgentHeartbeatRunRequest,
  createAdminAgentRunHistoryRequest,
  createAdminAgentLatestRunRequest,
  createCreateAdminAgentRunRequest,
} from './admin-page-agent-run-api';

describe('admin page agent run API requests', () => {
  it('uses stable encoded run paths', () => {
    expect(createAdminAgentLatestRunRequest('conversation/1').path).toBe(
      '/admin/page-agent/conversations/conversation%2F1/runs/latest',
    );
    expect(
      createCreateAdminAgentRunRequest('conversation/1', {
        clientRequestId: 'f727a121-e522-41c1-9572-01b1525d2484',
        prompt: '查询待审核导入',
      }).path,
    ).toBe('/admin/page-agent/conversations/conversation%2F1/runs');
    expect(createAdminAgentRunHistoryRequest('conversation/1').path).toBe(
      '/admin/page-agent/conversations/conversation%2F1/runs',
    );
  });

  it('serializes create, heartbeat, and terminal payloads', () => {
    const create = createCreateAdminAgentRunRequest('conversation-1', {
      clientRequestId: 'f727a121-e522-41c1-9572-01b1525d2484',
      prompt: '重新查询',
      retryOfRunId: 'run-previous',
    });
    const heartbeat = createAdminAgentHeartbeatRunRequest('run/1', {
      status: 'waiting_confirmation',
      currentStep: '等待用户确认',
      tokenCount: 42,
    });
    const complete = createAdminAgentCompleteRunRequest('run/1', {
      status: 'failed',
      errorCode: 'AGENT_EXECUTION_FAILED',
      errorSummary: '执行失败',
    });

    expect(create.init?.method).toBe('POST');
    expect(JSON.parse(String(create.init?.body))).toEqual({
      clientRequestId: 'f727a121-e522-41c1-9572-01b1525d2484',
      prompt: '重新查询',
      retryOfRunId: 'run-previous',
    });
    expect(heartbeat.path).toBe('/admin/page-agent/runs/run%2F1/heartbeat');
    expect(heartbeat.init?.method).toBe('PATCH');
    expect(complete.path).toBe('/admin/page-agent/runs/run%2F1/complete');
    expect(complete.init?.method).toBe('POST');
  });
});

describe('admin page agent run API responses', () => {
  it('parses nullable latest runs and interrupted recovery details', () => {
    expect(createAdminAgentLatestRunRequest('conversation-1').schema.parse(null)).toBeNull();
    expect(
      AdminAgentRunSchema.parse({
        id: 'run-1',
        conversationId: 'conversation-1',
        retryOfRunId: null,
        prompt: '查询待审核导入',
        status: 'interrupted',
        currentStep: '读取导入列表',
        tokenCount: 42,
        traceId: 'trace-1',
        errorCode: 'HEARTBEAT_TIMEOUT',
        errorSummary: '任务心跳超时',
        startedAt: '2026-07-23T08:00:00.000Z',
        finishedAt: '2026-07-23T08:02:00.000Z',
        heartbeatAt: '2026-07-23T08:00:15.000Z',
        updatedAt: '2026-07-23T08:02:00.000Z',
      }).status,
    ).toBe('interrupted');
    expect(createAdminAgentRunHistoryRequest('conversation-1').schema.parse([])).toEqual([]);
  });
});
