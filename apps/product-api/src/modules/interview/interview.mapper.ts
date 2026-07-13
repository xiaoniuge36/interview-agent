import { Prisma } from '@prisma/client';
import {
  AgentRuntimeSessionContextSchema,
  AgentStreamEventSchema,
  CONTRACT_LIMITS,
  InterviewCommandResultSchema,
  InterviewReportSchema,
  InterviewSessionSchema,
  InterviewTurnSchema,
  type AgentRuntimeSessionContext,
  type AgentStreamEvent,
  type InterviewCommandResult,
  type InterviewReport,
  type InterviewSession,
  type InterviewTurn,
} from '@interview-agent/contracts';
import { jsonValue } from '../../common/audit/audit.service';

export type SessionWithTurns = Prisma.InterviewSessionGetPayload<{
  include: { turns: true };
}>;

export function mapSession(record: SessionWithTurns): InterviewSession {
  return InterviewSessionSchema.parse({
    ...record,
    jobIntentId: record.jobIntentId ?? undefined,
    turns: record.turns.map(mapTurn),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

export function mapTurn(record: Prisma.InterviewTurnGetPayload<object>): InterviewTurn {
  return InterviewTurnSchema.parse({
    ...record,
    structuredPayload: jsonObject(record.structuredPayload),
    createdAt: record.createdAt.toISOString(),
  });
}

export function mapReport(record: Prisma.InterviewReportGetPayload<object>): InterviewReport {
  return InterviewReportSchema.parse({
    ...record,
    overall: record.overall,
    stageScores: record.stageScores,
    turnFeedback: record.turnFeedback,
    memoryEvents: record.memoryEvents,
    createdAt: record.createdAt.toISOString(),
  });
}

export function mapCommandResult(
  value: Prisma.JsonValue | null,
  replayed: boolean,
): InterviewCommandResult {
  const parsed = InterviewCommandResultSchema.parse(value);
  return { ...parsed, replayed };
}

export function toRuntimeContext(session: InterviewSession): AgentRuntimeSessionContext {
  const recentTurns = session.turns.slice(-CONTRACT_LIMITS.runtimeTurns).map((turn) => ({
    role: turn.role,
    stage: turn.stage,
    content: turn.content,
  }));
  return AgentRuntimeSessionContextSchema.parse({
    id: session.id,
    tenantId: session.tenantId,
    userId: session.userId,
    status: session.status,
    stage: session.stage,
    version: session.version,
    title: session.title,
    candidateTurnCount: session.turns.filter((turn) => turn.role === 'candidate').length,
    recentTurns,
  });
}

export function mapEvent(record: Prisma.InterviewEventGetPayload<object>): AgentStreamEvent {
  return AgentStreamEventSchema.parse({
    type: record.type,
    eventId: record.id,
    sessionId: record.sessionId,
    commandId: record.commandId,
    sequence: record.sequence,
    occurredAt: record.occurredAt.toISOString(),
    traceId: record.traceId,
    ...jsonObject(record.payload),
  });
}

export function eventPayload(event: AgentStreamEvent): Prisma.InputJsonValue {
  switch (event.type) {
    case 'workflow_started':
      return jsonValue({});
    case 'stage_changed':
      return jsonValue({ stage: event.stage });
    case 'token':
      return jsonValue({ content: event.content });
    case 'turn_completed':
      return jsonValue({ turn: event.turn });
    case 'report_ready':
      return jsonValue({ reportId: event.reportId });
    case 'error':
      return jsonValue({ code: event.code, message: event.message });
  }
}

function jsonObject(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (!value || Array.isArray(value) || typeof value !== 'object') return undefined;
  return value as Record<string, unknown>;
}
