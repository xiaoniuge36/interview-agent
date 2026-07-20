import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../common/config/environment';
import type { ProductRequestContext } from '../../common/context/request-context';
import { ModelInvocationGrantService } from './model-invocation-grant.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-test-0001',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'subject-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['model_credential:read'],
  },
};

function createService(credential: { id: string } | null = { id: 'credential-1' }) {
  const credentials = {
    resolveDefaultMetadata: jest.fn().mockResolvedValue(credential),
  };
  const config = {
    get: jest.fn().mockReturnValue('test-internal-token-with-at-least-32-characters'),
  };
  return {
    service: new ModelInvocationGrantService(
      config as unknown as ConfigService<Environment, true>,
      credentials as never,
    ),
    credentials,
  };
}

describe('ModelInvocationGrantService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-17T08:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('issues a tenant-scoped short-lived signed grant', async () => {
    const { service, credentials } = createService();

    const token = await service.issue(context, {
      sessionId: 'session-1',
      commandId: 'command-1',
      traceId: 'trace-test-0001',
    });

    expect(credentials.resolveDefaultMetadata).toHaveBeenCalledWith(context);
    expect(service.verify(token)).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-1',
        userId: 'user-1',
        credentialId: 'credential-1',
        operation: 'interview_next',
      }),
    );
  });
});

describe('ModelInvocationGrantService verification', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-17T08:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects a tampered signature', async () => {
    const { service } = createService();
    const token = await service.issue(context, {
      sessionId: 'session-1',
      commandId: 'command-1',
      traceId: 'trace-test-0001',
    });

    expect(() => service.verify(`${token.slice(0, -1)}x`)).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ code: 'MODEL_INVOCATION_GRANT_INVALID' }),
      }),
    );
  });

  it('rejects an expired grant', async () => {
    const { service } = createService();
    const token = await service.issue(context, {
      sessionId: 'session-1',
      commandId: 'command-1',
      traceId: 'trace-test-0001',
    });
    jest.setSystemTime(new Date('2026-07-17T08:01:00.000Z'));

    expect(() => service.verify(token)).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ code: 'MODEL_INVOCATION_GRANT_EXPIRED' }),
      }),
    );
  });
});
