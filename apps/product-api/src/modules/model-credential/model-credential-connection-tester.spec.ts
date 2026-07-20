import type { ProductRequestContext } from '../../common/context/request-context';
import { ModelCredentialConnectionTester } from './model-credential-connection-tester';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'user-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['model_credential:test'],
  },
};

describe('ModelCredentialConnectionTester', () => {
  it('measures a connection test while passing the decrypted key only to the provider client', async () => {
    const provider = { testConnection: jest.fn().mockResolvedValue(undefined) };
    const invocations = { measure: jest.fn((_metadata, run) => run(jest.fn())) };
    const tester = new ModelCredentialConnectionTester(provider as never, invocations as never);

    await tester.test(
      context,
      { id: 'credential-1', provider: 'deepseek', model: 'deepseek-chat', baseUrl: null },
      'sk-user-secret',
    );

    expect(invocations.measure).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'model_connection_test', credentialId: 'credential-1' }),
      expect.any(Function),
    );
    expect(JSON.stringify(invocations.measure.mock.calls)).not.toContain('sk-user-secret');
    expect(provider.testConnection).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'sk-user-secret', provider: 'deepseek' }),
    );
  });
});
