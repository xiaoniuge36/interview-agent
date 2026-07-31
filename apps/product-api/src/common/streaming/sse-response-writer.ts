import type { Response } from 'express';

type WriteMode = 'strict' | 'best-effort';

export function createSseResponseWriter(response: Response, signal?: AbortSignal) {
  let tail = Promise.resolve();
  let pendingWrites = 0;
  const send = (frame: string, mode: WriteMode = 'strict') => {
    pendingWrites += 1;
    const result = tail.then(() => writeFrame({ response, frame, signal, mode }));
    tail = result.catch(() => undefined);
    void result.then(writeFinished, writeFinished);
    return result;
  };
  const writeFinished = () => {
    pendingWrites -= 1;
  };
  return {
    send,
    heartbeat(frame: string) {
      if (pendingWrites > 0 || response.writableEnded || response.destroyed) return;
      void send(frame, 'best-effort');
    },
  };
}

async function writeFrame(input: {
  response: Response;
  frame: string;
  signal: AbortSignal | undefined;
  mode: WriteMode;
}) {
  const { response, frame, signal, mode } = input;
  if (response.writableEnded || response.destroyed || signal?.aborted) {
    if (mode === 'strict') throw closedError(signal);
    return;
  }
  if (response.write(frame)) return;
  try {
    await waitForDrain(response, signal);
  } catch (error) {
    if (mode === 'strict') throw error;
  }
}

function waitForDrain(response: Response, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onDrain = () => finish();
    const onClose = () => finish(closedError(signal));
    const onError = (error: Error) => finish(error);
    const onAbort = () => finish(closedError(signal));
    const cleanup = () => {
      response.off('drain', onDrain);
      response.off('close', onClose);
      response.off('error', onError);
      signal?.removeEventListener('abort', onAbort);
    };
    response.once('drain', onDrain);
    response.once('close', onClose);
    response.once('error', onError);
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted || response.writableEnded || response.destroyed) onClose();
  });
}

function closedError(signal?: AbortSignal) {
  const reason = signal?.reason;
  if (reason instanceof Error) return reason;
  return Object.assign(new Error('SSE response closed.'), { name: 'AbortError' });
}
