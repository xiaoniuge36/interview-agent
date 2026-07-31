import { request as httpsRequest, type RequestOptions } from 'node:https';
import { Readable } from 'node:stream';
import { HttpsProviderTransport, providerFetch } from './model-provider-request';

type SocketLookup = (
  hostname: string,
  options: { all?: boolean },
  callback: (error: Error | null, addresses: unknown) => void,
) => void;

describe('HttpsProviderTransport redirects', () => {
  it('does not follow a redirect to a private host or forward authorization again', async () => {
    const requests: Array<{ authorization: string | undefined; hostname: string }> = [];
    const transport = new HttpsProviderTransport(
      async () => ['8.8.8.8'],
      redirectResponseFactory(requests),
    );

    const response = await providerFetch(
      'https://model.example.test/v1/chat/completions',
      {
        method: 'POST',
        redirect: 'error',
        headers: { Authorization: 'Bearer test-key' },
        body: 'prompt',
      },
      { transport },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://169.254.169.254/latest/meta-data');
    expect(requests).toEqual([
      { authorization: 'Bearer test-key', hostname: 'model.example.test' },
    ]);
  });
});

function redirectResponseFactory(
  requests: Array<{ authorization: string | undefined; hostname: string }>,
): typeof httpsRequest {
  return ((options: RequestOptions, callback: (incoming: unknown) => void) => {
    let onError: ((error: Error) => void) | undefined;
    return {
      destroy: jest.fn(),
      end: () => {
        const lookup = options.lookup as unknown as SocketLookup;
        lookup(String(options.hostname), { all: true }, (error) => {
          if (error) {
            onError?.(error);
            return;
          }
          requests.push({
            authorization: headerValue(options.headers, 'Authorization'),
            hostname: String(options.hostname),
          });
          callback(
            Object.assign(Readable.from([]), {
              headers: { location: 'https://169.254.169.254/latest/meta-data' },
              statusCode: 302,
            }),
          );
        });
      },
      once: (_event: string, listener: (error: Error) => void) => {
        onError = listener;
      },
      setTimeout: jest.fn(),
    };
  }) as unknown as typeof httpsRequest;
}

function headerValue(headers: RequestOptions['headers'], name: string) {
  if (!headers || Array.isArray(headers)) return undefined;
  const value = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  )?.[1];
  const first = Array.isArray(value) ? value[0] : value;
  return first === undefined ? undefined : String(first);
}
