import { BadGatewayException } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import type { ProductRequestContext } from '../context/request-context';
import { createAiOperationSse, streamError } from './ai-operation-sse';

const context: ProductRequestContext = {
  requestId: 'request-12345678',
  traceId: 'trace-12345678',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'subject-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: [],
  },
};

describe('streamError', () => {
  it('does not mark an invalid model schema as retryable', () => {
    const error = new BadGatewayException({
      code: 'MODEL_PROVIDER_RESPONSE_INVALID',
      message: '模型未返回可用结果。',
    });

    expect(streamError(error, context)).toEqual({
      code: 'MODEL_PROVIDER_RESPONSE_INVALID',
      message: '模型未返回可用结果。',
      requestId: context.requestId,
      retryable: false,
    });
  });
});

describe('createAiOperationSse backpressure', () => {
  it('waits for drain before resolving a delta and preserves the write order', async () => {
    const response = new FakeResponse(false, true);
    const connection = createAiOperationSse(response as unknown as Response, context);
    let settled = false;
    const first = Promise.resolve(connection.sink.delta('interviewer_content', 'first')).then(
      () => {
        settled = true;
      },
    );

    await flushPromises();

    expect(response.writes).toHaveLength(1);
    expect(settled).toBe(false);
    response.emit('drain');
    await first;
    await connection.sink.delta('interviewer_content', 'second');

    expect(response.writes).toHaveLength(2);
    expect(response.writes[0]).toContain('first');
    expect(response.writes[1]).toContain('second');
    connection.close();
  });
});

describe('createAiOperationSse interrupted writes', () => {
  it.each(['close', 'abort', 'error'] as const)(
    'rejects a blocked write and removes listeners on %s',
    async (outcome) => {
      const response = new FakeResponse(false);
      const controller = new AbortController();
      const removeAbort = jest.spyOn(controller.signal, 'removeEventListener');
      const connection = createSseWithSignal(response, controller.signal);
      const pending = Promise.resolve(connection.sink.delta('interviewer_content', 'blocked'));

      await flushPromises();

      if (outcome === 'close') {
        response.destroyed = true;
        response.emit('close');
      } else if (outcome === 'abort') {
        controller.abort();
      } else {
        response.emit('error', new Error('socket failed'));
      }

      await expect(pending).rejects.toBeInstanceOf(Error);
      expect(response.listenerCount('drain')).toBe(0);
      expect(response.listenerCount('close')).toBe(0);
      expect(response.listenerCount('error')).toBe(0);
      expect(removeAbort).toHaveBeenCalled();
      connection.close();
    },
  );
});

describe('createAiOperationSse heartbeat and fast path', () => {
  it('does not send a heartbeat while a write is awaiting drain', async () => {
    jest.useFakeTimers();
    const response = new FakeResponse(false);
    const connection = createAiOperationSse(response as unknown as Response, context);
    const pending = Promise.resolve(connection.sink.delta('interviewer_content', 'blocked'));

    await Promise.resolve();
    jest.advanceTimersByTime(15_000);

    expect(response.writes).toHaveLength(1);
    response.emit('drain');
    await pending;
    connection.close();
    jest.useRealTimers();
  });

  it('uses the write true fast path without drain listeners', async () => {
    const response = new FakeResponse(true);
    const connection = createAiOperationSse(response as unknown as Response, context);

    await connection.sink.delta('interviewer_content', 'ready');

    expect(response.writes).toHaveLength(1);
    expect(response.listenerCount('drain')).toBe(0);
    connection.close();
  });
});

function createSseWithSignal(response: FakeResponse, signal: AbortSignal) {
  const create = createAiOperationSse as unknown as (
    response: Response,
    requestContext: ProductRequestContext,
    signal: AbortSignal,
  ) => ReturnType<typeof createAiOperationSse>;
  return create(response as unknown as Response, context, signal);
}

function flushPromises() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

class FakeResponse extends EventEmitter {
  readonly writes: string[] = [];
  writableEnded = false;
  destroyed = false;
  private readonly writeResults: boolean[];

  constructor(...writeResults: boolean[]) {
    super();
    this.writeResults = writeResults;
  }

  status() {
    return this;
  }

  setHeader() {
    return this;
  }

  flushHeaders() {}

  write = jest.fn((value: string) => {
    this.writes.push(value);
    return this.writeResults.shift() ?? true;
  });

  end = jest.fn(() => {
    this.writableEnded = true;
  });
}
