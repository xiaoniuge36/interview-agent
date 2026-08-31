import { ConflictException } from '@nestjs/common';
import type { InterviewSession } from '@interview-agent/contracts';
import { assertInterviewCommand, assertRuntimeDecision } from './interview-state-machine';

it('allows the first runtime decision to move from warmup to self introduction', () => {
  expect(() =>
    assertRuntimeDecision(session(), 'advance', {
      stage: 'self_intro',
      content: '请先做一个简短的自我介绍。',
      shouldFinish: false,
    }),
  ).not.toThrow();
});

it('rejects a command in the wrong status with a user-facing message', () => {
  const error = captureError(() => assertInterviewCommand(session(), 'answer', 0));

  expect(error).toBeInstanceOf(ConflictException);
  const response = (error as ConflictException).getResponse() as {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
  expect(response.code).toBe('INTERVIEW_COMMAND_NOT_ALLOWED');
  // 面向用户的 message 不携带内部状态与指令原文，内部信息留在 details。
  expect(response.message).not.toMatch(/created|waiting_user|answer|advance|status|command/u);
  expect(response.message).toContain('请刷新页面同步最新进度');
  expect(response.details).toEqual({ status: 'created', command: 'answer' });
});

it('keeps the version conflict code and internals for the client to auto-recover', () => {
  const error = captureError(() => assertInterviewCommand(session(), 'advance', 3));

  expect(error).toBeInstanceOf(ConflictException);
  const response = (error as ConflictException).getResponse() as {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
  expect(response.code).toBe('INTERVIEW_VERSION_CONFLICT');
  expect(response.details).toEqual({ expectedVersion: 3, actualVersion: 0 });
});

function captureError(run: () => void): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('预期抛出异常，但未抛出。');
}

function session(): InterviewSession {
  return {
    id: 'interview-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    status: 'created',
    stage: 'warmup',
    version: 0,
    eventSequence: 0,
    workflowRunId: 'workflow-1',
    title: '全栈开发工程师面试训练',
    turns: [],
    createdAt: '2026-07-31T00:00:00.000Z',
    updatedAt: '2026-07-31T00:00:00.000Z',
  };
}
