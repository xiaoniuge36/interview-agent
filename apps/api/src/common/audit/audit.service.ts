import { Injectable } from '@nestjs/common';
import { Prisma, type ActorRole, type AuditResult } from '@prisma/client';
import type { ProductRequestContext } from '../context/request-context';
import { PrismaService } from '../database/prisma.service';

export type AuditEventInput = {
  action: string;
  resourceType: string;
  resourceId: string;
  result?: 'success' | 'failure';
  stateTransition?: {
    from: string;
    to: string;
    version: number;
  };
  metadata?: Record<string, unknown>;
};

type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'>;

const DEFAULT_AUDIT_LIMIT = 100;
const MAX_AUDIT_LIMIT = 500;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(
    context: ProductRequestContext,
    event: AuditEventInput,
    client: AuditClient = this.prisma,
  ) {
    return client.auditLog.create({
      data: {
        requestId: context.requestId,
        traceId: context.traceId,
        tenantId: context.tenantId,
        actorId: context.actor.id,
        actorRole: context.actor.role as ActorRole,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        result: (event.result ?? 'success') as AuditResult,
        metadata: jsonValue(event.metadata ?? {}),
        ...(event.stateTransition ? { stateTransition: jsonValue(event.stateTransition) } : {}),
      },
    });
  }

  list(context: ProductRequestContext, limit = DEFAULT_AUDIT_LIMIT) {
    return this.prisma.auditLog.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), MAX_AUDIT_LIMIT),
    });
  }
}

export function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
