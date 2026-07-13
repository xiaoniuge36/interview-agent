import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { catchError, Observable, tap, throwError } from 'rxjs';
import type { ProductRequest } from '../context/product-request';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpRequest');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => this.write(request, response.statusCode, startedAt)),
      catchError((error: unknown) => {
        const status =
          typeof (error as { getStatus?: unknown })?.getStatus === 'function'
            ? (error as { getStatus: () => number }).getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        this.write(request, status, startedAt);
        return throwError(() => error);
      }),
    );
  }

  private write(request: Request, status: number, startedAt: number) {
    const productRequest = request as Partial<ProductRequest>;
    this.logger.log(
      JSON.stringify({
        method: request.method,
        path: request.originalUrl.split('?', 1)[0],
        status,
        durationMs: Date.now() - startedAt,
        requestId: productRequest.context?.requestId,
        traceId: productRequest.context?.traceId,
        actorId: productRequest.context?.actor.id,
        tenantId: productRequest.context?.tenantId,
      }),
    );
  }
}
