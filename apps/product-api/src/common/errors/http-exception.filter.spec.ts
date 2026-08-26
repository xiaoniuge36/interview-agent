import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { z } from 'zod';
import { HttpExceptionFilter } from './http-exception.filter';

type MockResponse = { status: jest.Mock; json: jest.Mock };

const requestContext = { requestId: 'req-1', traceId: 'trace-1' };

afterEach(() => jest.restoreAllMocks());

test('maps Zod validation errors to a 400 with issue details', () => {
  const { host, response } = buildHost(requestContext);

  new HttpExceptionFilter().catch(zodError(), host);

  expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  expect(body(response)).toMatchObject({
    error: {
      code: 'VALIDATION_FAILED',
      message: '请求数据校验失败。',
      details: [expect.objectContaining({ path: 'title' })],
    },
    requestId: 'req-1',
    traceId: 'trace-1',
  });
});

test('preserves structured codes from HttpException payloads', () => {
  const { host, response } = buildHost(requestContext);
  const exception = new NotFoundException({
    code: 'CANDIDATE_QUESTION_NOT_FOUND',
    message: 'Candidate question not found.',
  });

  new HttpExceptionFilter().catch(exception, host);

  expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  expect(body(response).error).toEqual({
    code: 'CANDIDATE_QUESTION_NOT_FOUND',
    message: 'Candidate question not found.',
  });
});

test('derives a default code from the status for string payloads', () => {
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const { host, response } = buildHost(requestContext);
  const exception = new HttpException('服务暂时不可用。', HttpStatus.SERVICE_UNAVAILABLE);

  new HttpExceptionFilter().catch(exception, host);

  expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  expect(body(response).error).toEqual({
    code: 'SERVICE_UNAVAILABLE',
    message: '服务暂时不可用。',
  });
});

test('joins message arrays produced by framework exceptions', () => {
  const { host, response } = buildHost(requestContext);
  const exception = new BadRequestException({ message: ['第一条', '第二条'] });

  new HttpExceptionFilter().catch(exception, host);

  expect(body(response).error).toMatchObject({
    code: 'BAD_REQUEST',
    message: '第一条; 第二条',
  });
});

test('masks unknown exceptions as 500 and logs with request identifiers', () => {
  const errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const { host, response } = buildHost(requestContext);

  new HttpExceptionFilter().catch(new Error('database exploded'), host);

  expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  expect(body(response).error).toEqual({
    code: 'INTERNAL_SERVER_ERROR',
    message: '服务内部错误。',
  });
  expect(errorLog).toHaveBeenCalledWith(
    expect.stringContaining('requestId=req-1'),
    expect.stringContaining('database exploded'),
  );
});

test('generates request identifiers when no request context is attached', () => {
  const { host, response } = buildHost(undefined);

  new HttpExceptionFilter().catch(new BadRequestException(), host);

  const payload = body(response);
  expect(typeof payload.requestId).toBe('string');
  expect(payload.traceId).toBe(payload.requestId);
  expect(typeof payload.timestamp).toBe('string');
});

function buildHost(context: { requestId: string; traceId: string } | undefined) {
  const response: MockResponse = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  const request = { method: 'GET', originalUrl: '/api/questions?page=1', context };
  const host = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

function body(response: MockResponse) {
  return response.json.mock.calls[0][0] as {
    error: { code: string; message: string; details?: unknown };
    requestId: string;
    traceId: string;
    timestamp: string;
  };
}

function zodError() {
  const parsed = z.object({ title: z.string() }).safeParse({});
  if (parsed.success) throw new Error('expected a validation failure');
  return parsed.error;
}
