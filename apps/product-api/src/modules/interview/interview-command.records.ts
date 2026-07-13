import { Prisma } from '@prisma/client';
import type { InterviewSession, InterviewTurn } from '@interview-agent/contracts';
import { jsonValue } from '../../common/audit/audit.service';
import { eventPayload } from './interview.mapper';
import type {
  CompleteCommandRequest,
  ExecuteCommandRequest,
  InvocationPreparation,
  StartCommandRequest,
} from './interview.types';

export function findIdempotentCommand(
  transaction: Prisma.TransactionClient,
  context: StartCommandRequest['context'],
  idempotencyKey: string,
) {
  return transaction.interviewCommand.findUnique({
    where: {
      tenantId_actorId_idempotencyKey: {
        tenantId: context.tenantId,
        actorId: context.actor.id,
        idempotencyKey,
      },
    },
  });
}

export function commandLeaseWhere(preparation: InvocationPreparation) {
  return {
    id: preparation.commandId,
    tenantId: preparation.context.tenantId,
    status: 'pending' as const,
    attemptCount: preparation.attemptCount,
  };
}

export function runInput(
  request: ExecuteCommandRequest,
  session: InterviewSession,
  commandAttempt: number,
) {
  return {
    command: request.command,
    expectedVersion: request.expectedVersion,
    answerLength: request.answer?.length ?? 0,
    sessionVersion: session.version,
    stage: session.stage,
    commandAttempt,
  };
}

export function runOutput(request: CompleteCommandRequest) {
  return {
    stage: request.runtime.stage,
    shouldFinish: request.runtime.shouldFinish,
    contentLength: request.runtime.content.length,
  };
}

export function turnRecord(turn: InterviewTurn): Prisma.InterviewTurnCreateManyInput {
  return {
    id: turn.id,
    tenantId: turn.tenantId,
    sessionId: turn.sessionId,
    commandId: turn.commandId,
    role: turn.role,
    stage: turn.stage,
    content: turn.content,
    ...(turn.structuredPayload ? { structuredPayload: jsonValue(turn.structuredPayload) } : {}),
    traceId: turn.traceId,
    createdAt: new Date(turn.createdAt),
  };
}

export function reportRecord(
  report: NonNullable<CompleteCommandRequest['artifacts']['report']>,
): Prisma.InterviewReportCreateInput {
  return {
    id: report.id,
    tenant: { connect: { id: report.tenantId } },
    session: {
      connect: {
        tenantId_id: { tenantId: report.tenantId, id: report.sessionId },
      },
    },
    overall: jsonValue(report.overall),
    stageScores: jsonValue(report.stageScores),
    turnFeedback: jsonValue(report.turnFeedback),
    projectDiagnosis: report.projectDiagnosis,
    nextActions: report.nextActions,
    memoryEvents: jsonValue(report.memoryEvents),
    createdAt: new Date(report.createdAt),
  };
}

export function memoryRecords(
  report: NonNullable<CompleteCommandRequest['artifacts']['report']>,
): Prisma.MemoryEventCreateManyInput[] {
  return report.memoryEvents.map((event) => ({
    id: event.id,
    tenantId: event.tenantId,
    userId: event.userId,
    eventType: event.eventType,
    sourceId: event.sourceId,
    evidence: event.evidence,
    delta: jsonValue(event.delta),
    confidence: event.confidence,
    createdAt: new Date(event.createdAt),
  }));
}

export function eventRecords(
  request: CompleteCommandRequest,
): Prisma.InterviewEventCreateManyInput[] {
  return request.artifacts.events.map((event) => ({
    id: event.eventId,
    tenantId: request.preparation.context.tenantId,
    sessionId: event.sessionId,
    commandId: event.commandId,
    sequence: event.sequence,
    type: event.type,
    payload: eventPayload(event),
    traceId: event.traceId,
    occurredAt: new Date(event.occurredAt),
  }));
}
