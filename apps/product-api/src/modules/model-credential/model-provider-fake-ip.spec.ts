import { request as httpsRequest, type RequestOptions } from 'node:https';
import { Readable } from 'node:stream';
import { HttpsProviderTransport, providerFetch } from './model-provider-request';

type SocketAddress = { address: string; family: number };
type SocketLookup = (
  hostname: string,
  options: { all?: boolean },
  callback: (error: Error | null, address: string | SocketAddress[], family?: number) => void,
) => void;

describe('HttpsProviderTransport fake-IP DNS compatibility', () => {
  it('connects to the verified public address when local DNS returns only fake IPs', async () => {
    const state = { lookupAddress: '' };
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      Response.json({
        Status: 0,
        Answer: [
          {
            name: 'model.example.test',
            type: 1,
            TTL: 60,
            data: '8.133.172.162',
          },
        ],
      }),
    );
    const transport = new HttpsProviderTransport(
      async () => ['198.18.0.21'],
      successfulRequestFactory(state),
    );

    try {
      await expect(
        providerFetch('https://model.example.test/v1', { method: 'GET' }, { transport }),
      ).resolves.toMatchObject({ status: 200 });

      expect(state.lookupAddress).toBe('8.133.172.162');
      const trustedDnsUrl = new URL(String(fetchMock.mock.calls[0]![0]));
      expect(trustedDnsUrl.origin).toBe('https://dns.alidns.com');
      expect(Object.fromEntries(trustedDnsUrl.searchParams)).toEqual({
        name: 'model.example.test',
        type: '1',
      });
    } finally {
      fetchMock.mockRestore();
    }
  });
});

describe('HttpsProviderTransport fake-IP IPv6 compatibility', () => {
  it('falls back to a verified public IPv6 address when no A record exists', async () => {
    const state = { lookupAddress: '' };
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(Response.json({ Status: 0, Answer: [] }))
      .mockResolvedValueOnce(
        Response.json({
          Status: 0,
          Answer: [{ name: 'model.example.test', type: 28, TTL: 60, data: '2606:4700::1111' }],
        }),
      );
    const transport = fakeIpTransport(state);

    try {
      await expect(
        providerFetch('https://model.example.test/v1', { method: 'GET' }, { transport }),
      ).resolves.toMatchObject({ status: 200 });

      expect(state.lookupAddress).toBe('2606:4700::1111');
    } finally {
      fetchMock.mockRestore();
    }
  });
});

describe('HttpsProviderTransport fake-IP DNS failures', () => {
  it('fails closed when trusted DNS returns a private address', async () => {
    const state = { lookupAddress: '' };
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      Response.json({
        Status: 0,
        Answer: [{ name: 'model.example.test', type: 1, TTL: 60, data: '10.0.0.8' }],
      }),
    );

    try {
      await expect(
        providerFetch(
          'https://model.example.test/v1',
          { method: 'GET' },
          { transport: fakeIpTransport(state) },
        ),
      ).rejects.toMatchObject({ code: 'MODEL_PROVIDER_ENDPOINT_BLOCKED' });

      expect(state.lookupAddress).toBe('');
    } finally {
      fetchMock.mockRestore();
    }
  });

  it('fails closed when trusted DNS is unavailable', async () => {
    const state = { lookupAddress: '' };
    const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('DNS unavailable'));

    try {
      await expect(
        providerFetch(
          'https://model.example.test/v1',
          { method: 'GET' },
          { transport: fakeIpTransport(state) },
        ),
      ).rejects.toMatchObject({ code: 'MODEL_PROVIDER_ENDPOINT_BLOCKED' });

      expect(state.lookupAddress).toBe('');
    } finally {
      fetchMock.mockRestore();
    }
  });
});

function fakeIpTransport(state: { lookupAddress: string }) {
  return new HttpsProviderTransport(async () => ['198.18.0.21'], successfulRequestFactory(state));
}

function successfulRequestFactory(state: { lookupAddress: string }): typeof httpsRequest {
  return ((options: RequestOptions, callback: (incoming: unknown) => void) => {
    const lookup = options.lookup as unknown as SocketLookup;
    let onError: ((error: Error) => void) | undefined;
    lookup(String(options.hostname), { all: true }, (error, addresses) => {
      if (error) {
        onError?.(error);
        return;
      }
      state.lookupAddress = Array.isArray(addresses) ? addresses[0]!.address : addresses;
      callback(Object.assign(Readable.from(['ok']), { headers: {}, statusCode: 200 }));
    });
    return {
      destroy: jest.fn(),
      end: jest.fn(),
      once: (_event: string, listener: (error: Error) => void) => {
        onError = listener;
      },
      setTimeout: jest.fn(),
    };
  }) as unknown as typeof httpsRequest;
}
