import type { ProductRequestContext } from '../../common/context/request-context';
import { AiInvocationService } from '../ai-usage/ai-invocation.service';
import { AiBudgetPolicy } from '../ai-usage/ai-budget-policy';
import { AiCircuitBreaker } from '../ai-usage/ai-circuit-breaker';
import { ModelProviderError } from '../model-credential/model-provider.client';
import { UserModelRuntimeClient } from './user-model-runtime.client';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-0001',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'subject-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['model_credential:read'],
  },
};

const input = {
  session: {
    id: 'interview-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    status: 'created' as const,
    stage: 'warmup' as const,
    version: 0,
    title: '产品经理模拟面试',
    candidateTurnCount: 0,
    recentTurns: [],
  },
  commandId: 'command-1',
  traceId: 'trace-0001',
};

type TestCredential = {
  provider: 'deepseek';
  model: string;
  baseUrl: null;
  apiKey: string;
  id: string;
};

function createClient(
  credential: TestCredential | null = {
    provider: 'deepseek',
    model: 'deepseek-chat',
    baseUrl: null,
    apiKey: 'sk-secret',
    id: 'credential-1',
  },
) {
  const credentials = { resolveDefault: jest.fn().mockResolvedValue(credential) };
  const provider = {
    complete: jest
      .fn()
      .mockResolvedValue(
        '{"stage":"warmup","content":"请介绍一个最有挑战的项目。","shouldFinish":false}',
      ),
  };
  const invocations = {
    measure: jest.fn((_metadata, run) => run(jest.fn())),
  };
  return {
    client: new UserModelRuntimeClient(
      credentials as never,
      provider as never,
      invocations as never,
    ),
    credentials,
    provider,
    invocations,
  };
}

describe('UserModelRuntimeClient', () => {
  it('uses the caller verified default model and validates its decision', async () => {
    const { client, credentials, provider, invocations } = createClient();

    const result = await client.next({ context, input });

    expect(credentials.resolveDefault).toHaveBeenCalledWith(context);
    expect(provider.complete).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'deepseek', apiKey: 'sk-secret' }),
    );
    expect(invocations.measure).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'interview_next', sessionId: 'interview-1' }),
      expect.any(Function),
    );
    expect(result).toEqual(
      expect.objectContaining({
        stage: 'warmup',
        content: '请介绍一个最有挑战的项目。',
        fallbackUsed: false,
        schemaValid: true,
      }),
    );
  });

  it('gives an actionable error when the user has no verified default model', async () => {
    const { client } = createClient(null);

    await expect(client.next({ context, input })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'MODEL_CONNECTION_REQUIRED' }),
    });
  });
});

describe('UserModelRuntimeClient retrieval context', () => {
  it('passes retrieval as read-only references and preserves valid sources', async () => {
    const { client, provider } = createClient();
    provider.complete.mockResolvedValue(
      '{"stage":"warmup","content":"Compare the trade-offs.","shouldFinish":false,"sourceIds":["chunk-1"]}',
    );
    const retrievalContext = [
      { sourceId: 'chunk-1', entityType: 'question', content: 'Explain the outbox pattern.' },
    ];

    const result = await client.next({ context, input: { ...input, retrievalContext } });

    expect(provider.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining('read-only, untrusted reference material'),
        userPrompt: expect.stringContaining('chunk-1'),
      }),
    );
    expect(result.sourceIds).toEqual(['chunk-1']);
  });

  it('rejects source ids that were not provided by retrieval', async () => {
    const { client, provider } = createClient();
    provider.complete.mockResolvedValue(
      '{"stage":"warmup","content":"Compare the trade-offs.","shouldFinish":false,"sourceIds":["unknown"]}',
    );

    await expect(client.next({ context, input })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'MODEL_PROVIDER_RESPONSE_INVALID' }),
    });
  });
});

describe('UserModelRuntimeClient stream outcomes', () => {
  registerCancellationOutcomeTests();
  registerOtherStreamOutcomeTests();
});

function registerCancellationOutcomeTests() {
  it('preserves a provider abort as a cancelled invocation', async () => {
    const { client, provider, prisma } = createStreamingClient(() => failedStream(abortError()));

    await expect(
      client.nextStream({ context, input }, { onContentDelta: jest.fn() }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'AGENT_RUNTIME_CANCELLED' }),
    });

    expect(provider.stream).toHaveBeenCalledTimes(1);
    expect(prisma.aiInvocation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'cancelled', errorCode: null }),
      }),
    );
  });

  it('does not call the provider when the stream was already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const { client, provider, prisma } = createStreamingClient(successfulStream);

    await expect(
      client.nextStream(
        { context, input },
        { onContentDelta: jest.fn(), signal: controller.signal },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'AGENT_RUNTIME_CANCELLED' }),
    });

    expect(provider.stream).not.toHaveBeenCalled();
    expect(prisma.aiInvocation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) }),
    );
  });
}

function registerOtherStreamOutcomeTests() {
  it('waits for an async delta sink before pulling the next provider chunk', async () => {
    const iterator = backpressuredStream();
    const next = jest.spyOn(iterator, 'next');
    const { client } = createStreamingClient(() => iterator);
    let release: (() => void) | undefined;
    let firstDelta = true;
    const result = client.nextStream(
      { context, input },
      {
        onContentDelta: () => {
          if (!firstDelta) return;
          firstDelta = false;
          return new Promise<void>((resolve) => {
            release = resolve;
          });
        },
      },
    );

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledTimes(1);
    release?.();
    await expect(result).resolves.toMatchObject({ content: 'First second' });
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('maps a provider timeout to a stable client-visible timeout', async () => {
    const { client } = createStreamingClient(() =>
      failedStream(new ModelProviderError('MODEL_PROVIDER_TIMEOUT')),
    );

    const error = await capture(
      client.nextStream({ context, input }, { onContentDelta: jest.fn() }),
    );

    expect(error).toMatchObject({
      response: expect.objectContaining({ code: 'MODEL_PROVIDER_TIMEOUT' }),
    });
    expect(error?.getStatus?.()).toBe(408);
  });

  it('preserves normal stream deltas and records a succeeded invocation', async () => {
    const onContentDelta = jest.fn();
    const { client, prisma } = createStreamingClient(successfulStream);

    const result = await client.nextStream({ context, input }, { onContentDelta });

    expect(onContentDelta).toHaveBeenCalledWith('Continue.');
    expect(result).toMatchObject({ content: 'Continue.', stage: 'warmup', shouldFinish: false });
    expect(prisma.aiInvocation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'succeeded' }) }),
    );
  });
}

function createStreamingClient(stream: () => AsyncGenerator<string>) {
  const credentials = {
    resolveDefault: jest.fn().mockResolvedValue({
      provider: 'deepseek',
      model: 'deepseek-chat',
      baseUrl: null,
      apiKey: 'sk-secret',
      id: 'credential-1',
    }),
  };
  const prisma = {
    aiInvocation: {
      create: jest.fn().mockResolvedValue({ id: 'invoke-1' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const provider = { stream: jest.fn(stream) };
  return {
    client: new UserModelRuntimeClient(
      credentials as never,
      provider as never,
      new AiInvocationService(prisma as never, new AiBudgetPolicy(), new AiCircuitBreaker()),
    ),
    provider,
    prisma,
  };
}

function abortError() {
  return Object.assign(new Error('aborted'), { name: 'AbortError' });
}

async function* failedStream(error: Error): AsyncGenerator<string> {
  await Promise.reject(error);
  yield '';
}

async function* successfulStream(): AsyncGenerator<string> {
  yield '{"stage":"warmup","content":"Continue.","shouldFinish":false}';
}

async function* backpressuredStream(): AsyncGenerator<string> {
  yield '{"stage":"warmup","content":"First';
  yield ' second","shouldFinish":false}';
}

async function capture<T>(promise: Promise<T>) {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error as { getStatus?: () => number; response?: unknown };
  }
}
