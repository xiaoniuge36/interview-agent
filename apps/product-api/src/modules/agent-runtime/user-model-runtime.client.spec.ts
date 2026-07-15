import type { ProductRequestContext } from '../../common/context/request-context';
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
      .mockResolvedValue('{"stage":"warmup","content":"请介绍一个最有挑战的项目。","shouldFinish":false}'),
  };
  return { client: new UserModelRuntimeClient(credentials as never, provider as never), credentials, provider };
}

describe('UserModelRuntimeClient', () => {
  it('uses the caller verified default model and validates its decision', async () => {
    const { client, credentials, provider } = createClient();

    const result = await client.next({ context, input });

    expect(credentials.resolveDefault).toHaveBeenCalledWith(context);
    expect(provider.complete).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'deepseek', apiKey: 'sk-secret' }),
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
