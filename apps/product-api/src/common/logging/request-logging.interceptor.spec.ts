import { Logger, NotFoundException } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError, type Observable } from 'rxjs';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_CREATED = 201;

let logSpy: jest.SpyInstance;

beforeEach(() => {
  logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

test('logs a sanitized summary without query strings, headers, or bodies', async () => {
  const interceptor = new RequestLoggingInterceptor();

  await lastValueFrom(interceptor.intercept(buildContext(), handler(of('ok'))));

  const payload = loggedPayload();
  expect(payload).toMatchObject({
    method: 'POST',
    path: '/api/interviews',
    status: HTTP_CREATED,
    requestId: 'req-1',
    traceId: 'trace-1',
    actorId: 'user-1',
    tenantId: 'tenant-1',
  });
  expect(typeof payload.durationMs).toBe('number');
  expect(JSON.stringify(payload)).not.toContain('secret');
  expect(payload).not.toHaveProperty('headers');
  expect(payload).not.toHaveProperty('body');
});

test('logs the mapped status for http exceptions and rethrows them', async () => {
  const interceptor = new RequestLoggingInterceptor();
  const failing = handler(throwError(() => new NotFoundException()));

  await expect(
    lastValueFrom(interceptor.intercept(buildContext(), failing)),
  ).rejects.toBeInstanceOf(NotFoundException);

  expect(loggedPayload().status).toBe(HTTP_NOT_FOUND);
});

test('falls back to a 500 status for errors without getStatus', async () => {
  const interceptor = new RequestLoggingInterceptor();
  const failing = handler(throwError(() => new Error('boom')));

  await expect(lastValueFrom(interceptor.intercept(buildContext(), failing))).rejects.toThrow(
    'boom',
  );

  expect(loggedPayload().status).toBe(HTTP_INTERNAL_ERROR);
});

test('omits identity fields when the request context is missing', async () => {
  const interceptor = new RequestLoggingInterceptor();
  const context = buildContext({ context: undefined });

  await lastValueFrom(interceptor.intercept(context, handler(of('ok'))));

  const payload = loggedPayload();
  expect(payload).not.toHaveProperty('requestId');
  expect(payload).not.toHaveProperty('actorId');
  expect(payload).not.toHaveProperty('tenantId');
});

function buildContext(overrides: Record<string, unknown> = {}): ExecutionContext {
  const request = {
    method: 'POST',
    originalUrl: '/api/interviews?token=secret-value',
    headers: { authorization: 'Bearer secret-token' },
    body: { password: 'secret-password' },
    context: {
      requestId: 'req-1',
      traceId: 'trace-1',
      tenantId: 'tenant-1',
      actor: { id: 'user-1' },
    },
    ...overrides,
  };
  const response = { statusCode: HTTP_CREATED };
  return {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ExecutionContext;
}

function handler(result: Observable<unknown>): CallHandler {
  return { handle: () => result };
}

function loggedPayload() {
  return JSON.parse(logSpy.mock.calls[0][0] as string) as Record<string, unknown>;
}
