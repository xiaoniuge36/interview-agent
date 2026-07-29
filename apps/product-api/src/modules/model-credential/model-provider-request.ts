const MODEL_REQUEST_TIMEOUT_MS = 30_000;

export class ModelProviderError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = ModelProviderError.name;
  }
}

export async function providerFetch(
  url: string,
  request: RequestInit,
  upstreamSignal?: AbortSignal,
): Promise<Response> {
  try {
    return await fetch(url, request);
  } catch (error) {
    if (upstreamSignal?.aborted) throw error;
    if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) {
      throw new ModelProviderError('MODEL_PROVIDER_TIMEOUT');
    }
    throw new ModelProviderError('MODEL_PROVIDER_UNAVAILABLE');
  }
}

export function requestSignal(
  signal: AbortSignal | undefined,
  timeoutMs = MODEL_REQUEST_TIMEOUT_MS,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}
