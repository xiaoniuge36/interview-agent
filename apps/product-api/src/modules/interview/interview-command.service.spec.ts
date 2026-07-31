import type { AgentRuntimeRetrievalContext, InterviewSession } from '@interview-agent/contracts';
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

describe('InterviewCommandService retrieval context', () => {
  it('passes only bounded retrieval context to Runtime without a free search tool', async () => {
    const retrievalContext = [
      {
        sourceId: 'chunk-1',
        entityType: 'question',
        content: 'Explain the outbox pattern.',
      },
    ];
    const { service, session, agent } = createStreamingService(retrievalContext);

    const result = await service.advance({
      context,
      sessionId: session.id,
      input: { expectedVersion: 0 },
      idempotencyKey: 'advance-rag-12345678',
    });

    const runtimeRequest = agent.next.mock.calls[0][0];
    expect(runtimeRequest.retrievalContext).toEqual(retrievalContext);
    expect(runtimeRequest).not.toHaveProperty('searchTool');
    expect(result.session.turns.at(-1)?.structuredPayload).toEqual({
      basisSummary: BASIS_SUMMARY,
      sourceIds: ['chunk-1'],
    });
  });
});

describe('InterviewCommandService caller cancellation', () => {
  it.each(['advance', 'answer'] as const)(
    'passes the non-stream %s signal to AgentRuntimeClient',
    async (command) => {
      const { service, agent, session } = createNonStreamingService(command);
      const controller = new AbortController();
      const request = {
        context,
        sessionId: session.id,
        input: {
          expectedVersion: 0,
          ...(command === 'answer' ? { answer: 'candidate answer' } : {}),
        },
        idempotencyKey: `${command}-12345678`,
      };
      const execute = service[command === 'advance' ? 'advance' : 'submitAnswer'].bind(
        service,
      ) as unknown as (value: typeof request, signal: AbortSignal) => Promise<unknown>;

      await execute(request, controller.signal);

      expect(agent.next).toHaveBeenCalledWith(
        expect.objectContaining({ commandId: 'command-1' }),
        context,
        { signal: controller.signal },
      );
    },
  );
});

function createStreamingService(retrievalContext: AgentRuntimeRetrievalContext[] = []) {
  const session = sessionRecord();
  const repository = {
    prepare: jest.fn().mockResolvedValue(preparedExecution(session)),
    complete: jest.fn().mockImplementation(async (request) => request.artifacts.result),
    fail: jest.fn().mockResolvedValue(undefined),
  };
  const agent = streamingAgent(retrievalContext.map((source) => source.sourceId));
  const service = new InterviewCommandService(
    {
      repository,
      policy: { assert: jest.fn() },
      agent,
    } as never,
    { forCommand: jest.fn().mockResolvedValue(retrievalContext) } as never,
  );
  return { service, repository, session, agent };
}

function createNonStreamingService(command: 'advance' | 'answer') {
  const session = {
    ...sessionRecord(),
    status: command === 'advance' ? ('created' as const) : ('waiting_user' as const),
  };
  const repository = {
    prepare: jest.fn().mockResolvedValue(preparedExecution(session, command)),
    complete: jest.fn().mockImplementation(async (request) => request.artifacts.result),
    fail: jest.fn().mockResolvedValue(undefined),
  };
  const agent = {
    next: jest.fn().mockResolvedValue({
      stage: 'warmup',
      content: VISIBLE_CONTENT,
      shouldFinish: false,
      latencyMs: 1,
      attempts: 1,
      fallbackUsed: false,
      schemaValid: true,
    }),
  };
  const service = new InterviewCommandService(
    {
      repository,
      policy: { assert: jest.fn() },
      agent,
    } as never,
    { forCommand: jest.fn().mockResolvedValue([]) } as never,
  );
  return { service, agent, session };
}

function preparedExecution(session: InterviewSession, command: 'advance' | 'answer' = 'advance') {
  return {
    kind: 'invoke',
    context,
    sessionId: session.id,
    command,
    expectedVersion: 0,
    idempotencyKey: 'advance-12345678',
    answer: command === 'answer' ? 'candidate answer' : undefined,
    commandId: 'command-1',
    runId: 'run-1',
    attemptCount: 1,
    session,
  };
}

function streamingAgent(sourceIds: string[]) {
  return {
    next: jest.fn().mockImplementation(async (_input, _context, progress) => {
      progress?.onContentDelta?.(VISIBLE_CONTENT);
      return {
        stage: 'warmup',
        content: VISIBLE_CONTENT,
        shouldFinish: false,
        basisSummary: BASIS_SUMMARY,
        ...(sourceIds.length ? { sourceIds } : {}),
        latencyMs: 1,
        attempts: 1,
        fallbackUsed: false,
        schemaValid: true,
      };
    }),
  };
}

function sessionRecord(): InterviewSession {
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
