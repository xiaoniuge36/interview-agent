import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AuthIdentityService } from '../authn/auth-identity.service';
import type { ProductRequest } from './product-request';

const PUBLIC_PATHS = new Set(['/health', '/api/health', '/api/health/live', '/api/health/ready']);

const correlationId = (value: unknown) => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return /^[a-zA-Z0-9_.:-]{8,128}$/.test(candidate) ? candidate : randomUUID();
};

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(private readonly identities: AuthIdentityService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const requestPath = req.originalUrl.split('?', 1)[0] ?? '';
    if (req.method === 'OPTIONS' || PUBLIC_PATHS.has(requestPath)) {
      next();
      return;
    }

    try {
      const requestId = correlationId(req.headers['x-request-id']);
      const traceId = correlationId(req.headers['x-trace-id']);
      const actor = await this.identities.resolve(req);
      (req as ProductRequest).context = {
        requestId,
        traceId,
        tenantId: actor.tenantId,
        actor,
      };
      res.setHeader('x-request-id', requestId);
      res.setHeader('x-trace-id', traceId);
      next();
    } catch (error) {
      next(error);
    }
  }
}
