import { request as httpsRequest, type RequestOptions } from 'node:https';
import { Readable } from 'node:stream';
import {
  defaultProviderTransport,
  HttpsProviderTransport,
  providerFetch,
  type ModelProviderError,
} from './model-provider-request';
import { ModelProviderClient } from './model-provider.client';

type SocketAddress = { address: string; family: number };
type SocketLookup = (
  hostname: string,
  options: { all?: boolean },
  callback: (error: Error | null, address: string | SocketAddress[], family?: number) => void,
) => void;

type RequestState = {
  bytesWritten: number;
  lookupReturnedAllAddresses: boolean;
  socketCount: number;
};

describe('HttpsProviderTransport blocked destinations', () => {
  it.each([
    ['IPv4 loopback', ['127.0.0.1']],
    ['IPv6 loopback alias', ['::7f00:1']],
    ['IPv6 multicast', ['ff02::1']],
    ['mixed DNS records', ['8.8.8.8', '::ffff:127.0.0.1']],
    ['IPv4 documentation range', ['198.51.100.8']],
    ['IPv4 TEST-NET-1 range', ['192.0.2.8']],
    ['IPv4 TEST-NET-3 range', ['203.0.113.8']],
    ['IPv4 unspecified range', ['0.0.0.1']],
    ['IPv4 shared address range', ['100.64.0.1']],
    ['IPv4 special-purpose range', ['192.0.0.1']],
    ['IPv4 deprecated relay range', ['192.88.99.1']],
    ['IPv4 multicast range', ['224.0.0.1']],
    ['IPv4 reserved range', ['240.0.0.1']],
    ['IPv6 documentation range', ['2001:db8::8']],
  ])('keeps %s blocked and non-retryable before a socket opens', async (_label, addresses) => {
    const state: RequestState = {
      bytesWritten: 0,
      lookupReturnedAllAddresses: false,
      socketCount: 0,
    };
    const transport = new HttpsProviderTransport(
      async () => addresses,
      guardedRequestFactory(state),
    );

    await expect(
      providerFetch(
        'https://model.example.test/v1/chat/completions',
        { method: 'POST', body: 'sensitive prompt' },
        { transport },
      ),
    ).rejects.toEqual(
      expect.objectContaining<Pick<ModelProviderError, 'code'>>({
        code: 'MODEL_PROVIDER_ENDPOINT_BLOCKED',
      }),
    );

    expect(state).toEqual({ bytesWritten: 0, lookupReturnedAllAddresses: true, socketCount: 0 });
  });
});

describe('HttpsProviderTransport resolver failure', () => {
  it('fails closed when the socket resolver cannot return any address', async () => {
    const state: RequestState = {
      bytesWritten: 0,
      lookupReturnedAllAddresses: false,
      socketCount: 0,
    };
    const transport = new HttpsProviderTransport(
      async () => Promise.reject(new Error('resolver failed')),
      guardedRequestFactory(state),
    );

    await expect(
      providerFetch(
        'https://model.example.test/v1',
        { method: 'POST', body: 'prompt' },
        { transport },
      ),
    ).rejects.toEqual(
      expect.objectContaining<Pick<ModelProviderError, 'code'>>({
        code: 'MODEL_PROVIDER_ENDPOINT_BLOCKED',
      }),
    );

    expect(state).toEqual({ bytesWritten: 0, lookupReturnedAllAddresses: true, socketCount: 0 });
  });
});

describe('defaultProviderTransport E2E isolation', () => {
  it('uses native fetch for an explicit loopback stub only in test mode', async () => {
    const original = {
      e2eModelStubUrl: process.env.E2E_MODEL_STUB_URL,
      jestWorkerId: process.env.JEST_WORKER_ID,
      nodeEnv: process.env.NODE_ENV,
    };
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }));
    delete process.env.JEST_WORKER_ID;
    process.env.NODE_ENV = 'test';
    process.env.E2E_MODEL_STUB_URL = 'http://127.0.0.1:4100/v1';

    try {
      await expect(
        defaultProviderTransport().fetch('http://127.0.0.1:4100/v1/chat/completions', {
          method: 'POST',
        }),
      ).resolves.toMatchObject({ status: 200 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      restoreEnvironment('E2E_MODEL_STUB_URL', original.e2eModelStubUrl);
      restoreEnvironment('JEST_WORKER_ID', original.jestWorkerId);
      restoreEnvironment('NODE_ENV', original.nodeEnv);
      fetchMock.mockRestore();
    }
  });
});

describe('HttpsProviderTransport Node lookup contract', () => {
  it('does not create a request when the caller signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const requestFactory = jest.fn() as unknown as typeof httpsRequest;
    const transport = new HttpsProviderTransport(async () => ['8.8.8.8'], requestFactory);

    await expect(
      providerFetch(
        'https://model.example.test/v1',
        { method: 'POST', body: 'prompt', signal: controller.signal },
        { transport },
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(requestFactory).not.toHaveBeenCalled();
  });
});

describe('HttpsProviderTransport Node lookup contract', () => {
  it('uses an unbracketed global IPv6 literal for TLS and socket lookup', async () => {
    const state = { hostname: '', lookupAddress: '', servername: '' };
    const transport = new HttpsProviderTransport(
      async () => ['2606:4700:4700::1111'],
      successfulRequestFactory(state),
    );

    await expect(
      providerFetch('https://[2606:4700:4700::1111]/v1', { method: 'GET' }, { transport }),
    ).resolves.toMatchObject({ status: 200 });

    expect(state).toEqual({
      hostname: '2606:4700:4700::1111',
      lookupAddress: '2606:4700:4700::1111',
      servername: '2606:4700:4700::1111',
    });
  });

  it('returns one address only when Node requests a single-address lookup', async () => {
    const state = { hostname: '', lookupAddress: '', servername: '' };
    const transport = new HttpsProviderTransport(
      async () => ['8.8.8.8', '1.1.1.1'],
      successfulRequestFactory(state, false),
    );

    await expect(
      providerFetch('https://model.example.test/v1', { method: 'GET' }, { transport }),
    ).resolves.toMatchObject({ status: 200 });

    expect(state.lookupAddress).toBe('8.8.8.8');
  });
});

describe('HttpsProviderTransport provider call paths', () => {
  it('blocks completion, compatible, embedding, and test connection before any socket opens', async () => {
    const state: RequestState = {
      bytesWritten: 0,
      lookupReturnedAllAddresses: false,
      socketCount: 0,
    };
    const client = new ModelProviderClient(
      new HttpsProviderTransport(async () => ['169.254.169.254'], guardedRequestFactory(state)),
    );
    const connection = {
      provider: 'openai' as const,
      model: 'gpt-test',
      baseUrl: null,
      apiKey: 'test-key',
    };

    await expect(
      client.complete({ ...connection, systemPrompt: 'system', userPrompt: 'prompt' }),
    ).rejects.toEqual(
      expect.objectContaining<Pick<ModelProviderError, 'code'>>({
        code: 'MODEL_PROVIDER_ENDPOINT_BLOCKED',
      }),
    );
    await expect(
      client.invokeCompatible({
        ...connection,
        requestBody: { model: connection.model, messages: [] },
      }),
    ).rejects.toEqual(
      expect.objectContaining<Pick<ModelProviderError, 'code'>>({
        code: 'MODEL_PROVIDER_ENDPOINT_BLOCKED',
      }),
    );
    await expect(client.embed(connection, ['prompt'])).rejects.toEqual(
      expect.objectContaining<Pick<ModelProviderError, 'code'>>({
        code: 'MODEL_PROVIDER_ENDPOINT_BLOCKED',
      }),
    );
    await expect(client.testConnection(connection)).rejects.toEqual(
      expect.objectContaining<Pick<ModelProviderError, 'code'>>({
        code: 'MODEL_PROVIDER_ENDPOINT_BLOCKED',
      }),
    );

    expect(state).toEqual({ bytesWritten: 0, lookupReturnedAllAddresses: true, socketCount: 0 });
  });
});

function guardedRequestFactory(state: RequestState): typeof httpsRequest {
  return ((options: RequestOptions) => {
    let onError: ((error: Error) => void) | undefined;
    return {
      destroy: jest.fn(),
      end: (body: unknown) => {
        const lookup = options.lookup as unknown as SocketLookup;
        lookup(String(options.hostname), { all: true }, (error, addresses) => {
          state.lookupReturnedAllAddresses = Array.isArray(addresses);
          if (error) {
            onError?.(error);
            return;
          }
          state.socketCount += 1;
          state.bytesWritten += Buffer.byteLength(String(body ?? ''));
          onError?.(new Error('socket opened'));
        });
      },
      once: (_event: string, listener: (error: Error) => void) => {
        onError = listener;
      },
      setTimeout: jest.fn(),
    };
  }) as unknown as typeof httpsRequest;
}

function successfulRequestFactory(
  state: {
    hostname: string;
    lookupAddress: string;
    servername: string;
  },
  all = true,
): typeof httpsRequest {
  return ((options: RequestOptions, callback: (incoming: unknown) => void) => {
    const lookup = options.lookup as unknown as SocketLookup;
    state.hostname = String(options.hostname);
    state.servername = String(options.servername);
    lookup(state.hostname, { all }, (error, addresses) => {
      if (error) throw error;
      state.lookupAddress = Array.isArray(addresses) ? addresses[0]!.address : addresses;
      callback(Object.assign(Readable.from(['ok']), { headers: {}, statusCode: 200 }));
    });
    return { destroy: jest.fn(), end: jest.fn(), once: jest.fn(), setTimeout: jest.fn() };
  }) as unknown as typeof httpsRequest;
}

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
