import type { IncomingMessage } from 'node:http';
import { request as httpsRequest, type RequestOptions } from 'node:https';
import { isIP } from 'node:net';
import { Readable } from 'node:stream';
import { validateProviderAddresses } from './model-provider-address-policy';
import { resolveProviderAddresses, systemResolveAll, type ResolveAll } from './model-provider-dns';
import { e2eModelStubUrl } from './model-provider-e2e';

const MODEL_REQUEST_TIMEOUT_MS = 30_000;
const HTTPS_DEFAULT_PORT = 443;
const HTTP_BAD_GATEWAY = 502;
const IPV4_FAMILY = 4;
const IPV6_FAMILY = 6;
const DISABLED_SOCKET_TIMEOUT_MS = 0;

type Destination = {
  hostname: string;
  path: string;
  port: number;
};

type SocketAddress = { address: string; family: number };
type SocketLookupCallback = (
  error: Error | null,
  address: string | SocketAddress[],
  family?: number,
) => void;

export class ModelProviderError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = ModelProviderError.name;
  }
}

export type { ResolveAll } from './model-provider-dns';
export type ProviderTransport = {
  fetch(url: string, request: RequestInit, options?: ProviderTransportOptions): Promise<Response>;
};

export const MODEL_PROVIDER_TRANSPORT = Symbol('MODEL_PROVIDER_TRANSPORT');
export type ProviderTransportOptions = {
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
};
export type ProviderFetchOptions = {
  transport?: ProviderTransport | undefined;
  upstreamSignal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
};

export class HttpsProviderTransport implements ProviderTransport {
  constructor(
    private readonly resolveAll: ResolveAll = systemResolveAll,
    private readonly requestFactory: typeof httpsRequest = httpsRequest,
  ) {}

  async fetch(
    url: string,
    request: RequestInit,
    options: ProviderTransportOptions = {},
  ): Promise<Response> {
    if (options.signal?.aborted || request.signal?.aborted) throw signalError(options.signal);
    const destination = parseDestination(url);
    if (isIpAddress(destination.hostname)) validateAddresses([destination.hostname]);
    return this.dispatch(destination, request, options);
  }

  private dispatch(
    destination: Destination,
    request: RequestInit,
    options: ProviderTransportOptions,
  ) {
    return new Promise<Response>((resolve, reject) => {
      let settled = false;
      let outbound: ReturnType<typeof httpsRequest> | null = null;
      let onAbort: () => void = () => undefined;
      const finish = (error?: Error, response?: Response) => {
        if (settled) return;
        settled = true;
        options.signal?.removeEventListener('abort', onAbort);
        outbound?.setTimeout(DISABLED_SOCKET_TIMEOUT_MS);
        if (error) {
          outbound?.destroy(error);
          reject(error);
          return;
        }
        resolve(response!);
      };
      onAbort = () => finish(signalError(options.signal));
      const requestOptions: RequestOptions = {
        protocol: 'https:',
        hostname: destination.hostname,
        port: destination.port,
        path: destination.path,
        method: request.method,
        headers: requestHeaders(request.headers),
        servername: destination.hostname,
        timeout: transportTimeout(options),
        lookup: this.socketLookup as RequestOptions['lookup'],
      };
      outbound = this.requestFactory(requestOptions, (incoming) => {
        finish(undefined, providerResponse(incoming));
      });
      if (settled) return;
      outbound.once('error', (error) => finish(error));
      outbound.setTimeout(transportTimeout(options), () => finish(timeoutError()));
      options.signal?.addEventListener('abort', onAbort, { once: true });
      if (options.signal?.aborted) {
        onAbort();
        return;
      }
      outbound.end(request.body ?? undefined);
    });
  }

  private socketLookup = (
    hostname: string,
    options: { all?: boolean },
    callback: SocketLookupCallback,
  ) => {
    void this.resolveForSocket(hostname).then(
      (addresses) => respondToLookup(options.all === true, callback, addresses),
      (error) => respondToLookupFailure(options.all === true, callback, error),
    );
  };

  private async resolveForSocket(hostname: string): Promise<SocketAddress[]> {
    const addresses = await resolveProviderAddresses(normalizeHostname(hostname), this.resolveAll);
    validateAddresses(addresses);
    return addresses.map(toSocketAddress);
  }
}

export function defaultProviderTransport(): ProviderTransport {
  return process.env.JEST_WORKER_ID || e2eModelStubUrl()
    ? new FetchProviderTransport()
    : new HttpsProviderTransport();
}

export async function providerFetch(
  url: string,
  request: RequestInit,
  options: ProviderFetchOptions = {},
): Promise<Response> {
  const transport = options.transport ?? defaultProviderTransport();
  const timeoutMs = transportTimeout(options);
  const signal = deadlineSignal(timeoutMs, [options.upstreamSignal, request.signal]);
  try {
    return await transport.fetch(url, request, { signal, timeoutMs });
  } catch (error) {
    if (error instanceof ModelProviderError || signal?.aborted) throw error;
    throw mapTransportError(error, signal);
  }
}

export function requestSignal(
  signal: AbortSignal | undefined,
  timeoutMs = MODEL_REQUEST_TIMEOUT_MS,
): AbortSignal {
  return deadlineSignal(timeoutMs, [signal]);
}

function transportTimeout(options: Pick<ProviderTransportOptions, 'timeoutMs'>) {
  return options.timeoutMs ?? MODEL_REQUEST_TIMEOUT_MS;
}

function deadlineSignal(timeoutMs: number, signals: Array<AbortSignal | null | undefined>) {
  const active = signals.filter(
    (signal): signal is AbortSignal => signal !== null && signal !== undefined,
  );
  return AbortSignal.any([...active, AbortSignal.timeout(timeoutMs)]);
}

function parseDestination(value: string): Destination {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port === '0')
      throw new Error();
    return {
      hostname: normalizeHostname(url.hostname),
      path: `${url.pathname}${url.search}`,
      port: url.port ? Number(url.port) : HTTPS_DEFAULT_PORT,
    };
  } catch {
    throw new ModelProviderError('MODEL_PROVIDER_ENDPOINT_BLOCKED');
  }
}

function validateAddresses(addresses: string[]) {
  try {
    validateProviderAddresses(addresses);
  } catch {
    throw new ModelProviderError('MODEL_PROVIDER_ENDPOINT_BLOCKED');
  }
}

function isIpAddress(value: string) {
  return isIP(value) !== 0;
}

function responseHeaders(headers: Record<string, string | string[] | undefined>) {
  const normalized = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) normalized.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  return normalized;
}

function providerResponse(incoming: IncomingMessage) {
  return new Response(Readable.toWeb(incoming) as ReadableStream, {
    status: incoming.statusCode ?? HTTP_BAD_GATEWAY,
    headers: responseHeaders(incoming.headers),
  });
}

function requestHeaders(headers: HeadersInit | undefined) {
  if (headers === undefined) return undefined;
  return Object.fromEntries(new Headers(headers).entries());
}

function mapTransportError(error: unknown, signal: AbortSignal | undefined) {
  if (error instanceof ModelProviderError) return error;
  if (signal?.aborted) return error;
  if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) {
    return new ModelProviderError('MODEL_PROVIDER_TIMEOUT');
  }
  return new ModelProviderError('MODEL_PROVIDER_UNAVAILABLE');
}

function signalError(signal: AbortSignal | undefined) {
  const reason = signal?.reason;
  if (
    typeof reason === 'object' &&
    reason !== null &&
    (reason as { name?: unknown }).name === 'TimeoutError'
  ) {
    return timeoutError();
  }
  return abortError();
}

function timeoutError() {
  return new ModelProviderError('MODEL_PROVIDER_TIMEOUT');
}

function abortError() {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

function normalizeHostname(hostname: string) {
  return hostname.replace(/^\[|\]$/g, '');
}

function toSocketAddress(address: string): SocketAddress {
  return { address, family: address.includes(':') ? IPV6_FAMILY : IPV4_FAMILY };
}

function respondToLookup(all: boolean, callback: SocketLookupCallback, addresses: SocketAddress[]) {
  if (all) {
    callback(null, addresses);
    return;
  }
  const first = addresses[0]!;
  callback(null, first.address, first.family);
}

function respondToLookupFailure(all: boolean, callback: SocketLookupCallback, error: unknown) {
  const blocked =
    error instanceof ModelProviderError
      ? error
      : new ModelProviderError('MODEL_PROVIDER_ENDPOINT_BLOCKED');
  if (all) {
    callback(blocked, []);
    return;
  }
  callback(blocked, '', 0);
}

class FetchProviderTransport implements ProviderTransport {
  fetch(url: string, request: RequestInit): Promise<Response> {
    return fetch(url, request);
  }
}
