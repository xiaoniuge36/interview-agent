import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuditService, jsonValue } from '../../common/audit/audit.service';
import { mapSession } from './interview.mapper';
import { startAuditEvent } from './interview-command.audit';
import { replayExisting, startFingerprint, startResult } from './interview-command.errors';
import { findIdempotentCommand } from './interview-command.records';
import type { StartCommandRequest } from './interview.types';

@Injectable()
export class InterviewCommandStartHandler {
  constructor(private readonly audit: AuditService) {}

  async execute(transaction: Prisma.TransactionClient, request: StartCommandRequest) {
    const fingerprint = startFingerprint(request);
    const existing = await findIdempotentCommand(
      transaction,
      request.context,
      request.idempotencyKey,
    );
    if (existing) return replayExisting(existing, fingerprint);
    await this.assertOwnedJobIntent(transaction, request);
    return this.create(transaction, request, fingerprint);
  }

  private async create(
    transaction: Prisma.TransactionClient,
    request: StartCommandRequest,
    fingerprint: string,
  ) {
    const commandId = `command_${randomUUID()}`;
    const record = await transaction.interviewSession.create({
      data: {
        id: `interview_${randomUUID()}`,
        tenantId: request.context.tenantId,
        userId: request.context.actor.id,
        ...(request.input.jobIntentId ? { jobIntentId: request.input.jobIntentId } : {}),
        workflowRunId: `workflow_${randomUUID()}`,
        title: request.input.title,
      },
    });
    const session = mapSession({ ...record, turns: [] });
    const result = startResult(commandId, session);
    await transaction.interviewCommand.create({
      data: commandRecord({ request, commandId, fingerprint, sessionId: session.id, result }),
    });
    await this.audit.record(request.context, startAuditEvent(request, session), transaction);
    return result;
  }

  private async assertOwnedJobIntent(
    transaction: Prisma.TransactionClient,
    request: StartCommandRequest,
  ) {
    if (!request.input.jobIntentId) return;
    const intent = await transaction.jobIntent.findFirst({
      where: {
        id: request.input.jobIntentId,
        tenantId: request.context.tenantId,
        userId: request.context.actor.id,
      },
      select: { id: true },
    });
    if (!intent) throw new NotFoundException('JobIntent not found');
  }
}

function commandRecord(input: {
  request: StartCommandRequest;
  commandId: string;
  fingerprint: string;
  sessionId: string;
  result: ReturnType<typeof startResult>;
}): Prisma.InterviewCommandUncheckedCreateInput {
  return {
    id: input.commandId,
    tenantId: input.request.context.tenantId,
    sessionId: input.sessionId,
    actorId: input.request.context.actor.id,
    idempotencyKey: input.request.idempotencyKey,
    fingerprint: input.fingerprint,
    type: 'start',
    status: 'completed',
    result: jsonValue(input.result),
    traceId: input.request.context.traceId,
    attemptCount: 1,
    completedAt: new Date(),
  };
}
