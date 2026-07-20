import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../common/config/environment';
import { AgentRuntimeClient, AgentRuntimeInvocationError } from './agent-runtime.client';

const VALID_RESPONSE = {
  contractVersion: 'interview-runtime.v1',
  stage: 'warmup',
  content: '请介绍一个代表性项目。',
  shouldFinish: false,
};

function createClient(
  overrides: Partial<Environment> = {},
  userModels?: { next: jest.Mock; nextStream?: jest.Mock },
  grants?: { issue: jest.Mock },
) {
  const values: Partial<Environment> = {
    AGENT_RUNTIME_URL: 'http://runtime.test',
    AGENT_RUNTIME_TIMEOUT_MS: 100,
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
    grants as never,
  );
}

function requestInput() {
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

function requestContext() {
  return {
    requestId: 'request-1',
    traceId: 'trace-test-0001',
    tenantId: 'tenant-a',
    actor: {
      id: 'user-a',
      subject: 'subject-a',
      tenantId: 'tenant-a',
      role: 'user' as const,
      scopes: ['model_credential:read' as const],
    },
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AgentRuntimeClient successful responses', () => {
  it('sends a signed model grant through the Agent Runtime for authenticated users', async () => {
    const userModels = {
      next: jest.fn(),
    };
    const grants = { issue: jest.fn().mockResolvedValue('signed-runtime-grant.payload-signature') };
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(VALID_RESPONSE)));
    const context = requestContext();

    const result = await createClient({}, userModels, grants).next(requestInput(), context);

    expect(grants.issue).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ commandId: 'command-1', sessionId: 'interview-1' }),
    );
    expect(userModels.next).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0]?.[1]?.body).toContain('signed-runtime-grant.payload-signature');
    expect(result.content).toBe(VALID_RESPONSE.content);
  });
});

describe('AgentRuntimeClient streaming compatibility', () => {
  it('keeps the real provider streaming path when progress callbacks are supplied', async () => {
    const streamed = {
      stage: 'warmup' as const,
      content: '流式问题',
      shouldFinish: false,
      latencyMs: 12,
      attempts: 1,
      fallbackUsed: false,
      schemaValid: true,
    };
    const userModels = { next: jest.fn(), nextStream: jest.fn().mockResolvedValue(streamed) };
    const grants = { issue: jest.fn() };
    const delta = jest.fn();

    const result = await createClient({}, userModels, grants).next(
      requestInput(),
      requestContext(),
      { onContentDelta: delta },
    );

    expect(userModels.nextStream).toHaveBeenCalledWith(
      expect.objectContaining({ context: requestContext() }),
      expect.objectContaining({ onContentDelta: delta }),
    );
    expect(grants.issue).not.toHaveBeenCalled();
    expect(result.content).toBe(streamed.content);
  });
});

describe('AgentRuntimeClient runtime responses', () => {
  it('validates a successful response and returns flattened telemetry', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(VALID_RESPONSE)));

    const result = await createClient().next(requestInput());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        stage: 'warmup',
        content: VALID_RESPONSE.content,
        attempts: 1,
        fallbackUsed: false,
        schemaValid: true,
      }),
    );
    expect(result).not.toHaveProperty('decision');
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ redirect: 'error' }));
  });
});

describe('AgentRuntimeClient retry and validation failures', () => {
  it('does not retry a rejected 4xx request', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 400 }));

    await expect(createClient().next(requestInput())).rejects.toMatchObject({
      telemetry: expect.objectContaining({
        code: 'AGENT_RUNTIME_REQUEST_REJECTED',
        attempts: 1,
      }),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries retryable 5xx responses up to the configured limit', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 503 }));

    await expect(createClient().next(requestInput())).rejects.toBeInstanceOf(
      AgentRuntimeInvocationError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry an invalid response schema', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ stage: 'warmup' })));

    await expect(createClient().next(requestInput())).rejects.toMatchObject({
      telemetry: expect.objectContaining({
        code: 'AGENT_RUNTIME_SCHEMA_INVALID',
        attempts: 1,
        schemaValid: false,
      }),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('AgentRuntimeClient fallback and size limits', () => {
  it('uses the bounded local fallback when schema validation fails', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ invalid: true })));
    const client = createClient({ AGENT_RUNTIME_FALLBACK_ENABLED: true });

    const result = await client.next(requestInput());

    expect(result).toEqual(
      expect.objectContaining({
        stage: 'warmup',
        fallbackUsed: true,
        schemaValid: false,
        attempts: 1,
      }),
    );
  });

  it('rejects a declared response body larger than the safety limit', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('{}', {
        headers: { 'content-length': '70000' },
      }),
    );

    await expect(createClient().next(requestInput())).rejects.toMatchObject({
      telemetry: expect.objectContaining({
        code: 'AGENT_RUNTIME_SCHEMA_INVALID',
        attempts: 1,
      }),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
