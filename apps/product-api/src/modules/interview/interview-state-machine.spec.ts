import type { InterviewSession } from '@interview-agent/contracts';
import { assertRuntimeDecision } from './interview-state-machine';

it('allows the first runtime decision to move from warmup to self introduction', () => {
  expect(() =>
    assertRuntimeDecision(session(), 'advance', {
      stage: 'self_intro',
      content: '请先做一个简短的自我介绍。',
      shouldFinish: false,
    }),
  ).not.toThrow();
});

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
