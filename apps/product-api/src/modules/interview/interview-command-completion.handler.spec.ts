import type { InterviewSession } from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { buildCompletion } from './interview-command.builder';
import { InterviewCommandCompletionHandler } from './interview-command-completion.handler';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-0001',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'user-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['interview:advance'],
  },
};

test('projects report memory events in the interview completion transaction', async () => {
  const memory = { apply: jest.fn() };
  const handler = new InterviewCommandCompletionHandler(
    { record: jest.fn() } as never,
    memory as never,
  );
  const preparation = invocationPreparation();
  const runtime = finalRuntime();
  const artifacts = buildCompletion({
    preparation,
    runtime,
    occurredAt: '2026-07-28T00:00:00.000Z',
  });
  const transaction = completionTransaction();

  await handler.complete(transaction as never, { preparation, runtime, artifacts });

  expect(artifacts.report).toBeDefined();
  expect(memory.apply).toHaveBeenCalledWith(transaction, artifacts.report!.memoryEvents);
});

function invocationPreparation() {
  return {
    kind: 'invoke' as const,
    context,
    sessionId: 'session-1',
    command: 'answer' as const,
    expectedVersion: 1,
    idempotencyKey: 'key-1',
    answer: '我会先明确边界，再说明权衡。',
    commandId: 'command-1',
    runId: 'run-1',
    attemptCount: 1,
    session: interviewSession(),
  };
}

function finalRuntime() {
  return {
    stage: 'final_evaluation' as const,
    content: '请查看本次面试报告。',
    shouldFinish: true,
    latencyMs: 10,
    attempts: 1,
    fallbackUsed: false,
    schemaValid: true,
  };
}

function interviewSession(): InterviewSession {
  return {
    id: 'session-1',
    tenantId: context.tenantId,
    userId: context.actor.id,
    status: 'waiting_user',
    stage: 'final_evaluation',
    version: 1,
    eventSequence: 1,
    workflowRunId: 'workflow-1',
    title: '后端工程师模拟面试',
    turns: [],
    createdAt: '2026-07-28T00:00:00.000Z',
    updatedAt: '2026-07-28T00:00:00.000Z',
  };
}

function completionTransaction() {
  return {
    interviewSession: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    interviewTurn: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
    interviewReport: { create: jest.fn().mockResolvedValue({}) },
    interviewEvent: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    agentRun: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    interviewCommand: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
}
