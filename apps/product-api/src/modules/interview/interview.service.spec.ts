import {
  ConflictException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { InterviewSession } from '@interview-agent/contracts';
import { PolicyService } from '../../common/authz/policy.service';
import { developmentActor, type ProductRequestContext } from '../../common/context/request-context';
import type { AgentRuntimeClient, AgentNextResult } from '../agent-runtime/agent-runtime.client';
import type { InterviewCommandRepository } from './interview-command.repository';
import { InterviewCommandService } from './interview-command.service';
import type { InvocationPreparation } from './interview.types';

const context = (tenantId = 'tenant-a'): ProductRequestContext => ({
  requestId: 'request-test-0001',
  traceId: 'trace-test-0001',
  tenantId,
  actor: { ...developmentActor('user'), tenantId, id: 'user-a' },
});

const session = (overrides: Partial<InterviewSession> = {}): InterviewSession => ({
  id: 'interview-1',
  tenantId: 'tenant-a',
  userId: 'user-a',
  status: 'created',
  stage: 'warmup',
  version: 0,
  eventSequence: 0,
  workflowRunId: 'workflow-1',
  title: 'Agent 模拟面试',
  turns: [],
  createdAt: '2026-07-10T08:00:00.000Z',
  updatedAt: '2026-07-10T08:00:00.000Z',
  ...overrides,
});

const preparation = (overrides: Partial<InvocationPreparation> = {}): InvocationPreparation => ({
  kind: 'invoke',
  context: context(),
  sessionId: 'interview-1',
  command: 'advance',
  expectedVersion: 0,
  idempotencyKey: 'advance-key-0001',
  answer: undefined,
  commandId: 'command-1',
  runId: 'run-1',
  attemptCount: 1,
  session: session(),
  ...overrides,
});

const runtimeResult = (overrides: Partial<AgentNextResult> = {}): AgentNextResult => ({
  stage: 'warmup',
  content: '请介绍一个代表性项目。',
  shouldFinish: false,
  latencyMs: 20,
  attempts: 1,
  fallbackUsed: false,
  schemaValid: true,
  ...overrides,
});

function setup() {
  const repository = {
    start: jest.fn(),
    prepare: jest.fn(),
    complete: jest.fn(async (request) => request.artifacts.result),
    fail: jest.fn(async () => undefined),
  };
  const agent = { next: jest.fn(async () => runtimeResult()) };
  const service = new InterviewCommandService(
    repository as unknown as InterviewCommandRepository,
    new PolicyService(),
    agent as unknown as AgentRuntimeClient,
  );
  return { service, repository, agent };
}

describe('InterviewCommandService command creation', () => {
  it('starts a command through the durable repository', async () => {
    const { service, repository } = setup();
    const expected = { commandId: 'command-start' };
    repository.start.mockResolvedValue(expected);
    const request = {
      context: context(),
      input: { title: 'Agent 模拟面试', focusTags: [] },
      idempotencyKey: 'start-key-0001',
    };

    await expect(service.start(request)).resolves.toBe(expected);
    expect(repository.start).toHaveBeenCalledWith(request);
  });

  it('returns an idempotent replay without invoking Runtime', async () => {
    const { service, repository, agent } = setup();
    const replay = {
      commandId: 'command-1',
      sessionId: 'interview-1',
      sessionVersion: 1,
      eventCursor: 4,
      replayed: true,
      session: session({ version: 1, eventSequence: 4 }),
    };
    repository.prepare.mockResolvedValue({ kind: 'replay', result: replay });

    await expect(
      service.advance({
        context: context(),
        sessionId: 'interview-1',
        input: { expectedVersion: 0 },
        idempotencyKey: 'advance-key-0001',
      }),
    ).resolves.toBe(replay);
    expect(agent.next).not.toHaveBeenCalled();
    expect(repository.complete).not.toHaveBeenCalled();
  });
});

describe('InterviewCommandService Runtime completion', () => {
  it('invokes Runtime and atomically completes a valid command', async () => {
    const { service, repository, agent } = setup();
    repository.prepare.mockResolvedValue(preparation());

    const result = await service.advance({
      context: context(),
      sessionId: 'interview-1',
      input: { expectedVersion: 0 },
      idempotencyKey: 'advance-key-0001',
    });

    expect(agent.next).toHaveBeenCalledWith({
      session: expect.objectContaining({
        id: 'interview-1',
        candidateTurnCount: 0,
        recentTurns: [],
      }),
      traceId: 'trace-test-0001',
      commandId: 'command-1',
    }, expect.objectContaining({
      tenantId: 'tenant-a',
      actor: expect.objectContaining({ id: 'user-a' }),
    }));
    expect(repository.complete).toHaveBeenCalledTimes(1);
    expect(result.sessionVersion).toBe(1);
    expect(result.session.turns).toHaveLength(1);
  });
});

describe('InterviewCommandService failure handling', () => {
  it('persists Runtime failure telemetry without mutating the session', async () => {
    const { service, repository, agent } = setup();
    repository.prepare.mockResolvedValue(preparation());
    agent.next.mockRejectedValue(
      new ServiceUnavailableException({
        code: 'AGENT_RUNTIME_UNAVAILABLE',
        message: 'unavailable',
      }),
    );

    await expect(
      service.advance({
        context: context(),
        sessionId: 'interview-1',
        input: { expectedVersion: 0 },
        idempotencyKey: 'advance-key-0001',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(repository.complete).not.toHaveBeenCalled();
    expect(repository.fail).toHaveBeenCalledWith({
      preparation: expect.objectContaining({ commandId: 'command-1' }),
      telemetry: expect.objectContaining({
        code: 'AGENT_RUNTIME_UNAVAILABLE',
        fallbackUsed: false,
      }),
    });
  });

  it('rejects and records an invalid Runtime transition', async () => {
    const { service, repository, agent } = setup();
    repository.prepare.mockResolvedValue(preparation());
    agent.next.mockResolvedValue(runtimeResult({ stage: 'report_ready' }));

    await expect(
      service.advance({
        context: context(),
        sessionId: 'interview-1',
        input: { expectedVersion: 0 },
        idempotencyKey: 'advance-key-0001',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(repository.fail).toHaveBeenCalledTimes(1);
  });
});

describe('InterviewCommandService authorization and concurrency', () => {
  it('denies a command when the actor tenant differs from the request tenant', async () => {
    const { service, repository } = setup();
    const invalid = context('tenant-a');
    invalid.actor.tenantId = 'tenant-b';

    await expect(
      service.advance({
        context: invalid,
        sessionId: 'interview-1',
        input: { expectedVersion: 0 },
        idempotencyKey: 'advance-key-0001',
      }),
    ).rejects.toThrow();
    expect(repository.prepare).not.toHaveBeenCalled();
  });

  it('preserves optimistic concurrency conflicts from the repository', async () => {
    const { service, repository } = setup();
    repository.prepare.mockRejectedValue(
      new ConflictException({ code: 'INTERVIEW_VERSION_CONFLICT' }),
    );

    await expect(
      service.advance({
        context: context(),
        sessionId: 'interview-1',
        input: { expectedVersion: 0 },
        idempotencyKey: 'advance-key-0001',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
