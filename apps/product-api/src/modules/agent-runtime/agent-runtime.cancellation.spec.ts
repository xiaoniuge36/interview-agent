import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../common/config/environment';
import { AgentRuntimeClient } from './agent-runtime.client';

const response = {
  contractVersion: 'interview-runtime.v1',
  stage: 'warmup',
  content: '请介绍一个代表性项目。',
  shouldFinish: false,
};

function client(
  userModels?: { next: jest.Mock; nextStream?: jest.Mock },
  overrides: Partial<Environment> = {},
) {
  const values: Partial<Environment> = {
    AGENT_RUNTIME_URL: 'http://runtime.test',
    AGENT_RUNTIME_TIMEOUT_MS: 10_000,
    AGENT_RUNTIME_MAX_ATTEMPTS: 3,
    AGENT_RUNTIME_RETRY_BASE_MS: 0,
    AGENT_RUNTIME_FALLBACK_ENABLED: false,
    INTERNAL_AGENT_TOKEN: 'test-internal-token-123456',
    ...overrides,
  };
  const config = {
    get: jest.fn((key: keyof Environment) => values[key]),
  };
  return new AgentRuntimeClient(
    config as unknown as ConfigService<Environment, true>,
    userModels as never,
  );
}

function input() {
  return {
    session: {
      id: 'interview-1',
      tenantId: 'tenant-a',
      userId: 'user-a',
      status: 'created' as const,
      stage: 'warmup' as const,
      version: 0,
      title: 'Agent 模拟面试',
      candidateTurnCount: 0,
      recentTurns: [],
    },
    traceId: 'trace-test-0001',
    commandId: 'command-1',
  };
}

function context() {
  return {
    requestId: 'request-1',
    traceId: 'trace-test-0001',
    tenantId: 'tenant-a',
    actor: {
      id: 'user-a',
      subject: 'subject-a',
      tenantId: 'tenant-a',
      role: 'user' as const,
      scopes: [],
    },
  };
}

afterEach(() => jest.restoreAllMocks());

registerCancellationTransportTests();

function registerCancellationTransportTests() {
  describe('AgentRuntimeClient caller cancellation transport', () => {
    registerPreAbortedTest();
    registerInFlightCancellationTest();
    registerTimeoutTest();
    registerNetworkRetryTest();
  });
}

function registerPreAbortedTest() {
  it('skips the downstream call for a pre-aborted non-stream request', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(response)));

    await expect(
      client(undefined, { AGENT_RUNTIME_FALLBACK_ENABLED: true }).next(input(), undefined, {
        signal: AbortSignal.abort(),
      }),
    ).rejects.toMatchObject({
      telemetry: expect.objectContaining({ code: 'AGENT_RUNTIME_CANCELLED', attempts: 0 }),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
}

function registerInFlightCancellationTest() {
  it('aborts an in-flight runtime request without retrying it', async () => {
    let resolveResponse!: (value: Response) => void;
    let rejectResponse!: (reason: Error) => void;
    let abortObserved = false;
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((_url, init) => {
      init?.signal?.addEventListener('abort', () => {
        abortObserved = true;
        rejectResponse(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      });
      return new Promise<Response>((resolve, reject) => {
        resolveResponse = resolve;
        rejectResponse = reject;
      });
    });
    const controller = new AbortController();
    const pending = client(undefined, { AGENT_RUNTIME_FALLBACK_ENABLED: true }).next(
      input(),
      undefined,
      { signal: controller.signal },
    );
    const outcome = pending.then(
      () => ({ fulfilled: true }),
      (error: { telemetry?: unknown }) => ({ fulfilled: false, telemetry: error.telemetry }),
    );

    await waitForCall(fetchMock);
    controller.abort();
    try {
      expect(abortObserved).toBe(true);
      await expect(outcome).resolves.toMatchObject({
        fulfilled: false,
        telemetry: expect.objectContaining({ code: 'AGENT_RUNTIME_CANCELLED', attempts: 1 }),
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      resolveResponse(new Response(JSON.stringify(response)));
      await outcome;
    }
  });
}

function registerTimeoutTest() {
  it('does not retry an internal runtime timeout', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(Object.assign(new Error('timeout'), { name: 'AbortError' })),
            { once: true },
          );
        }),
    );
    const outcome = client(undefined, { AGENT_RUNTIME_TIMEOUT_MS: 5 })
      .next(input())
      .then(
        () => ({ fulfilled: true }),
        (error: { telemetry?: unknown }) => ({ fulfilled: false, telemetry: error.telemetry }),
      );

    try {
      await jest.runAllTimersAsync();
      await expect(outcome).resolves.toMatchObject({
        fulfilled: false,
        telemetry: expect.objectContaining({ code: 'AGENT_RUNTIME_TIMEOUT', attempts: 1 }),
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
}

function registerNetworkRetryTest() {
  it('keeps network failures retryable', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('network unavailable'));

    await expect(client().next(input())).rejects.toMatchObject({
      telemetry: expect.objectContaining({ code: 'AGENT_RUNTIME_NETWORK_ERROR', attempts: 3 }),
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
}

describe('AgentRuntimeClient caller cancellation routing', () => {
  it('keeps a signal-only request on the Agent Runtime path', async () => {
    const userModels = { next: jest.fn(), nextStream: jest.fn().mockResolvedValue({}) };
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(response)));

    await client(userModels).next(input(), context(), { signal: new AbortController().signal });

    expect(userModels.nextStream).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

async function waitForCall(mock: { mock: { calls: unknown[] } }) {
  while (!mock.mock.calls.length) await new Promise((resolve) => setImmediate(resolve));
}
