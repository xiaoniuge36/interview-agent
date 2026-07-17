import type { ProductRequestContext } from '../../common/context/request-context';
import { InterviewCommandService } from './interview-command.service';

const context: ProductRequestContext = {
  requestId: 'request-12345678',
  traceId: 'trace-12345678',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'subject-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['interview:advance'],
  },
};
const VISIBLE_CONTENT = '请介绍你的项目。';
const BASIS_SUMMARY = ['从项目经历开始了解你的实践范围'];

describe('InterviewCommandService streaming', () => {
  it('streams only visible content and returns the result after completion', async () => {
    const { service, repository, session } = createStreamingService();
    const events: string[] = [];

    const execution = await service.advanceStream(
      {
        context,
        sessionId: session.id,
        input: { expectedVersion: 0 },
        idempotencyKey: 'advance-12345678',
      },
      { phase: (phase) => events.push(phase), delta: (content) => events.push(content) },
    );

    expect(events).toEqual([
      'preparing',
      'analyzing',
      'composing',
      VISIBLE_CONTENT,
      'validating',
      'saving',
    ]);
    expect(repository.complete).toHaveBeenCalledTimes(1);
    expect(execution.basisSummary).toEqual(BASIS_SUMMARY);
    expect(execution.result.session.turns.at(-1)?.structuredPayload).toEqual({
      basisSummary: BASIS_SUMMARY,
    });
  });
});

function createStreamingService() {
  const session = sessionRecord();
  const repository = {
    prepare: jest.fn().mockResolvedValue(preparedExecution(session)),
    complete: jest.fn().mockImplementation(async (request) => request.artifacts.result),
    fail: jest.fn().mockResolvedValue(undefined),
  };
  const service = new InterviewCommandService(
    repository as never,
    { assert: jest.fn() } as never,
    streamingAgent() as never,
  );
  return { service, repository, session };
}

function preparedExecution(session: ReturnType<typeof sessionRecord>) {
  return {
    kind: 'invoke',
    context,
    sessionId: session.id,
    command: 'advance',
    expectedVersion: 0,
    idempotencyKey: 'advance-12345678',
    answer: undefined,
    commandId: 'command-1',
    runId: 'run-1',
    attemptCount: 1,
    session,
  };
}

function streamingAgent() {
  return {
    next: jest.fn().mockImplementation(async (_input, _context, progress) => {
      progress.onContentDelta(VISIBLE_CONTENT);
      return {
        stage: 'warmup',
        content: VISIBLE_CONTENT,
        shouldFinish: false,
        basisSummary: BASIS_SUMMARY,
        latencyMs: 1,
        attempts: 1,
        fallbackUsed: false,
        schemaValid: true,
      };
    }),
  };
}

function sessionRecord() {
  return {
    id: 'session-1',
    tenantId: context.tenantId,
    userId: context.actor.id,
    status: 'created' as const,
    stage: 'warmup' as const,
    version: 0,
    eventSequence: 0,
    workflowRunId: 'workflow-1',
    title: 'Backend interview',
    turns: [],
    createdAt: '2026-07-17T00:00:00.000Z',
    updatedAt: '2026-07-17T00:00:00.000Z',
  };
}
