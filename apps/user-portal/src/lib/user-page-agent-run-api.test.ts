import { describe, expect, it } from 'vitest';
import {
  UserAgentRunSchema,
  createUserAgentCompleteRunRequest,
  createUserAgentHeartbeatRunRequest,
  createUserAgentRunHistoryRequest,
  createUserAgentLatestRunRequest,
  createUserAgentRunRequest,
} from './user-page-agent-run-api';

describe('user page agent run API requests', () => {
  it('uses stable encoded conversation and run paths', () => {
    expect(createUserAgentRunHistoryRequest('conversation/1').path).toBe(
      '/user/page-agent/conversations/conversation%2F1/runs',
    );
    expect(createUserAgentLatestRunRequest('conversation/1').path).toBe(
      '/user/page-agent/conversations/conversation%2F1/runs/latest',
    );
    expect(
      createUserAgentHeartbeatRunRequest('run/1', { status: 'waiting_confirmation' }).path,
    ).toBe('/user/page-agent/runs/run%2F1/heartbeat');
  });

  it('serializes create and terminal payloads', () => {
    const create = createUserAgentRunRequest('conversation-1', {
      clientRequestId: 'f727a121-e522-41c1-9572-01b1525d2484',
      prompt: '给出一份训练建议',
      retryOfRunId: 'run-previous',
    });
    const complete = createUserAgentCompleteRunRequest('run-1', {
      status: 'failed',
      errorCode: 'AGENT_EXECUTION_FAILED',
      errorSummary: '执行失败',
    });

    expect(create.init?.method).toBe('POST');
    expect(JSON.parse(String(create.init?.body))).toEqual({
      clientRequestId: 'f727a121-e522-41c1-9572-01b1525d2484',
      prompt: '给出一份训练建议',
      retryOfRunId: 'run-previous',
    });
    expect(complete.path).toBe('/user/page-agent/runs/run-1/complete');
    expect(complete.init?.method).toBe('POST');
  });
});

describe('user page agent run API responses', () => {
  it('parses nullable latest run and interrupted recovery details', () => {
    expect(createUserAgentLatestRunRequest('conversation-1').schema.parse(null)).toBeNull();
    expect(
      UserAgentRunSchema.parse({
        id: 'run-1',
        conversationId: 'conversation-1',
        retryOfRunId: null,
        prompt: '分析本轮训练重点',
        status: 'interrupted',
        currentStep: '读取近期练习记录',
        tokenCount: 42,
        traceId: 'trace-1',
        errorCode: 'HEARTBEAT_TIMEOUT',
        errorSummary: '任务心跳超时',
        startedAt: '2026-07-27T08:00:00.000Z',
        finishedAt: '2026-07-27T08:02:00.000Z',
        heartbeatAt: '2026-07-27T08:00:15.000Z',
        updatedAt: '2026-07-27T08:02:00.000Z',
      }).status,
    ).toBe('interrupted');
  });
});
