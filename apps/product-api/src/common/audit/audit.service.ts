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

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(
    context: ProductRequestContext,
    event: AuditEventInput,
    client: AuditClient = this.prisma,
  ) {
    return client.auditLog.create({ data: auditLogData(context, event) });
  }

  recordMany(
    context: ProductRequestContext,
    events: AuditEventInput[],
    client: AuditClient = this.prisma,
  ) {
    return client.auditLog.createMany({
      data: events.map((event) => auditLogData(context, event)),
    });
  }
}

export function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function auditLogData(context: ProductRequestContext, event: AuditEventInput) {
  return {
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
  };
}
