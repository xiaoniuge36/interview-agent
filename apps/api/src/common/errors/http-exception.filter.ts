import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import type { ProductRequest } from '../context/product-request';

type NormalizedError = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const productContext = (request as Partial<ProductRequest>).context;
    const requestId = productContext?.requestId ?? randomUUID();
    const traceId = productContext?.traceId ?? requestId;
    const normalized = normalizeException(exception);

    if (normalized.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${normalized.code} requestId=${requestId} traceId=${traceId} path=${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(normalized.status).json({
      error: {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.details === undefined ? {} : { details: normalized.details }),
      },
      requestId,
      traceId,
      timestamp: new Date().toISOString(),
    });
  }
}

function normalizeException(exception: unknown): NormalizedError {
  if (exception instanceof ZodError) {
    return {
      status: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_FAILED',
      message: '请求数据校验失败。',
      details: exception.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
        message: issue.message,
      })),
    };
  }
  if (exception instanceof HttpException) return normalizeHttpException(exception);
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
    message: '服务内部错误。',
  };
}

function normalizeHttpException(exception: HttpException): NormalizedError {
  const status = exception.getStatus();
  const payload = exception.getResponse();
  if (typeof payload === 'string') {
    return { status, code: defaultCode(status), message: payload };
  }
  const body = payload as Record<string, unknown>;
  const message = Array.isArray(body.message)
    ? body.message.join('; ')
    : typeof body.message === 'string'
      ? body.message
      : exception.message;
  return {
    status,
    code: typeof body.code === 'string' ? body.code : defaultCode(status),
    message,
    ...(body.details === undefined ? {} : { details: body.details }),
  };
}

function defaultCode(status: number) {
  return typeof HttpStatus[status] === 'string' ? String(HttpStatus[status]) : 'HTTP_ERROR';
}
