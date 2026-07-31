import { request as httpsRequest, type RequestOptions } from 'node:https';
import { ModelProviderClient } from './model-provider.client';
import {
  HttpsProviderTransport,
  ModelProviderError,
  providerFetch,
} from './model-provider-request';

type SocketLookup = (
  hostname: string,
  options: { all?: boolean },
  callback: (error: Error | null, address: unknown) => void,
) => void;

type RequestState = { destroyCalls: number; socketCount: number };

describe('HttpsProviderTransport deadline lifecycle', () => {
  it('destroys an in-flight request when its provider deadline expires', async () => {
    const state: RequestState = { destroyCalls: 0, socketCount: 0 };
    const transport = new HttpsProviderTransport(
      async () => ['8.8.8.8'],
      slowRequestFactory(state),
    );
    const outcome = capture(
      providerFetch(
        'https://model.example.test/v1',
        { method: 'POST', body: 'prompt' },
        { transport, timeoutMs: 5 },
      ),
    );

    await wait(40);

    expect(state).toEqual({ destroyCalls: 1, socketCount: 1 });
    await expect(outcome).resolves.toEqual(timeoutOutcome());
  });
});

describe('ModelProviderClient deadline propagation', () => {
  it('keeps the internal deadline when the caller signal is still live', async () => {
    const state: RequestState = { destroyCalls: 0, socketCount: 0 };
    const controller = new AbortController();
    const outcome = capture(slowClient(state).complete(completionInput(controller.signal, 5)));

    await wait(40);

    expect(state).toEqual({ destroyCalls: 1, socketCount: 1 });
    await expect(outcome).resolves.toEqual(timeoutOutcome());
  });
});

describe('ModelProviderClient cancellation lifecycle', () => {
  it('settles once when caller cancellation wins the deadline race', async () => {
    const state: RequestState = { destroyCalls: 0, socketCount: 0 };
    const controller = new AbortController();
    const outcome = capture(slowClient(state).complete(completionInput(controller.signal, 30)));

    await wait(1);
    controller.abort();
    await wait(40);

    expect(state).toEqual({ destroyCalls: 1, socketCount: 1 });
    await expect(outcome).resolves.toEqual({
      error: expect.objectContaining({ name: 'AbortError' }),
    });
  });
});

function slowRequestFactory(state: RequestState): typeof httpsRequest {
  return ((options: RequestOptions) => {
    let onError: ((error: Error) => void) | undefined;
    return {
      destroy: () => {
        state.destroyCalls += 1;
      },
      end: () => {
        const lookup = options.lookup as unknown as SocketLookup;
        lookup(String(options.hostname), { all: true }, (error) => {
          if (error) onError?.(error);
          else state.socketCount += 1;
        });
      },
      once: (_event: string, listener: (error: Error) => void) => {
        onError = listener;
      },
      setTimeout: (milliseconds: number, listener: () => void) => {
        if (milliseconds > 0) setTimeout(listener, milliseconds);
      },
    };
  }) as unknown as typeof httpsRequest;
}

function slowClient(state: RequestState) {
  return new ModelProviderClient(
    new HttpsProviderTransport(async () => ['8.8.8.8'], slowRequestFactory(state)),
  );
}

function completionInput(signal: AbortSignal, timeoutMs: number) {
  return {
    provider: 'openai' as const,
    model: 'gpt-test',
    baseUrl: null,
    apiKey: 'test-key',
    signal,
    timeoutMs,
    systemPrompt: 'system',
    userPrompt: 'prompt',
  };
}

function capture(promise: Promise<unknown>) {
  return promise.then(
    () => ({ error: undefined }),
    (error: unknown) => ({ error }),
  );
}

function timeoutOutcome() {
  return {
    error: expect.objectContaining<Pick<ModelProviderError, 'code'>>({
      code: 'MODEL_PROVIDER_TIMEOUT',
    }),
  };
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
