import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService, jsonValue } from '../../common/audit/audit.service';
import { completionAuditEvent, failureAuditEvent } from './interview-command.audit';
import { lostCommandLease, versionConflict } from './interview-command.errors';
import {
  commandLeaseWhere,
  eventRecords,
  memoryRecords,
  reportRecord,
  runOutput,
  turnRecord,
} from './interview-command.records';
import type { CompleteCommandRequest, FailCommandRequest } from './interview.types';

@Injectable()
export class InterviewCommandCompletionHandler {
  constructor(private readonly audit: AuditService) {}

  async complete(transaction: Prisma.TransactionClient, request: CompleteCommandRequest) {
    await this.updateSession(transaction, request);
    await transaction.interviewTurn.createMany({
      data: request.artifacts.turns.map(turnRecord),
    });
    if (request.artifacts.report) {
      await this.persistReport(transaction, request);
    }
    await transaction.interviewEvent.createMany({ data: eventRecords(request) });
    await this.completeRun(transaction, request);
    await this.completeCommand(transaction, request);
    await this.audit.record(
      request.preparation.context,
      completionAuditEvent(request),
      transaction,
    );
    return request.artifacts.result;
  }

  async fail(transaction: Prisma.TransactionClient, request: FailCommandRequest): Promise<void> {
    await this.failRun(transaction, request);
    const command = await transaction.interviewCommand.updateMany({
      where: commandLeaseWhere(request.preparation),
      data: {
        status: 'failed',
        errorCode: request.telemetry.code,
        leaseExpiresAt: null,
        completedAt: new Date(),
      },
    });
    if (command.count === 0) return;
    await this.audit.record(request.preparation.context, failureAuditEvent(request), transaction);
  }

  private async updateSession(
    transaction: Prisma.TransactionClient,
    request: CompleteCommandRequest,
  ) {
    const preparation = request.preparation;
    const updated = await transaction.interviewSession.updateMany({
      where: {
        id: preparation.sessionId,
        tenantId: preparation.context.tenantId,
        userId: preparation.context.actor.id,
        version: preparation.expectedVersion,
        status: preparation.session.status,
      },
      data: {
        status: request.artifacts.session.status,
        stage: request.artifacts.session.stage,
        version: request.artifacts.session.version,
        eventSequence: request.artifacts.session.eventSequence,
        updatedAt: new Date(request.artifacts.session.updatedAt),
      },
    });
    if (updated.count === 0) throw versionConflict();
  }

  private async persistReport(
    transaction: Prisma.TransactionClient,
    request: CompleteCommandRequest,
  ) {
    const report = request.artifacts.report;
    if (!report) return;
    await transaction.interviewReport.create({ data: reportRecord(report) });
    await transaction.memoryEvent.createMany({ data: memoryRecords(report) });
  }

  private async completeRun(
    transaction: Prisma.TransactionClient,
    request: CompleteCommandRequest,
  ) {
    const updated = await transaction.agentRun.updateMany({
      where: {
        id: request.preparation.runId,
        tenantId: request.preparation.context.tenantId,
        commandId: request.preparation.commandId,
        status: 'running',
      },
      data: {
        status: request.runtime.fallbackUsed ? 'fallback' : 'succeeded',
        stage: request.runtime.stage,
        output: jsonValue(runOutput(request)),
        error: null,
        latencyMs: request.runtime.latencyMs,
        schemaValid: request.runtime.schemaValid,
        fallbackUsed: request.runtime.fallbackUsed,
        attemptCount: request.runtime.attempts,
      },
    });
    if (updated.count === 0) throw lostCommandLease();
  }

  private async completeCommand(
    transaction: Prisma.TransactionClient,
    request: CompleteCommandRequest,
  ) {
    const updated = await transaction.interviewCommand.updateMany({
      where: commandLeaseWhere(request.preparation),
      data: {
        status: 'completed',
        result: jsonValue(request.artifacts.result),
        errorCode: null,
        leaseExpiresAt: null,
        completedAt: new Date(),
      },
    });
    if (updated.count === 0) throw lostCommandLease();
  }

  private async failRun(transaction: Prisma.TransactionClient, request: FailCommandRequest) {
    await transaction.agentRun.updateMany({
      where: {
        id: request.preparation.runId,
        tenantId: request.preparation.context.tenantId,
        status: 'running',
      },
      data: failureRunData(request),
    });
  }
}

function failureRunData(request: FailCommandRequest): Prisma.AgentRunUpdateManyMutationInput {
  return {
    status: 'failed',
    error: request.telemetry.code,
    fallbackUsed: request.telemetry.fallbackUsed,
    ...(request.telemetry.latencyMs === undefined
      ? {}
      : { latencyMs: request.telemetry.latencyMs }),
    ...(request.telemetry.attempts === undefined
      ? {}
      : { attemptCount: request.telemetry.attempts }),
    ...(request.telemetry.schemaValid === undefined
      ? {}
      : { schemaValid: request.telemetry.schemaValid }),
  };
}
