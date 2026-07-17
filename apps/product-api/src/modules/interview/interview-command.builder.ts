import type {
  InterviewCommandResult,
  InterviewSession,
  InterviewTurn,
} from '@interview-agent/contracts';
import type { AgentNextResult } from '../agent-runtime/agent-runtime.types';
import { createInterviewEvents, createInterviewTurn } from './interview-event.factory';
import { createInterviewReport } from './interview-report.factory';
import type { CompletionArtifacts, InvocationPreparation } from './interview.types';

export function buildCompletion(input: {
  preparation: InvocationPreparation;
  runtime: AgentNextResult;
  occurredAt?: string;
}): CompletionArtifacts {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const turns = createTurns({ ...input, occurredAt });
  const baseSession = nextSession({ ...input, turns, occurredAt });
  const report = input.runtime.shouldFinish
    ? createInterviewReport({
        session: baseSession,
        traceId: input.preparation.context.traceId,
        createdAt: occurredAt,
      })
    : undefined;
  const interviewerTurn = requireInterviewerTurn(turns);
  const events = createInterviewEvents({
    sessionId: baseSession.id,
    commandId: input.preparation.commandId,
    initialSequence: input.preparation.session.eventSequence,
    stage: input.runtime.stage,
    turn: interviewerTurn,
    ...(report ? { reportId: report.id } : {}),
    traceId: input.preparation.context.traceId,
    occurredAt,
  });
  const session = {
    ...baseSession,
    eventSequence: events.at(-1)?.sequence ?? baseSession.eventSequence,
  };
  return {
    result: completionResult(input.preparation.commandId, session),
    session,
    turns,
    events,
    report,
  };
}

function createTurns(input: {
  preparation: InvocationPreparation;
  runtime: AgentNextResult;
  occurredAt: string;
}): InterviewTurn[] {
  const common = {
    tenantId: input.preparation.context.tenantId,
    sessionId: input.preparation.sessionId,
    commandId: input.preparation.commandId,
    traceId: input.preparation.context.traceId,
    createdAt: input.occurredAt,
  };
  const candidate = input.preparation.answer
    ? [
        createInterviewTurn({
          ...common,
          role: 'candidate',
          stage: input.preparation.session.stage,
          content: input.preparation.answer,
        }),
      ]
    : [];
  const interviewer = createInterviewTurn({
    ...common,
    role: 'interviewer',
    stage: input.runtime.stage,
    content: input.runtime.content,
    ...(input.runtime.basisSummary?.length
      ? { structuredPayload: { basisSummary: input.runtime.basisSummary } }
      : {}),
  });
  return [...candidate, interviewer];
}

function nextSession(input: {
  preparation: InvocationPreparation;
  runtime: AgentNextResult;
  turns: InterviewTurn[];
  occurredAt: string;
}): InterviewSession {
  const current = input.preparation.session;
  return {
    ...current,
    status: input.runtime.shouldFinish ? 'report_ready' : 'waiting_user',
    stage: input.runtime.shouldFinish ? 'report_ready' : input.runtime.stage,
    version: current.version + 1,
    turns: [...current.turns, ...input.turns],
    updatedAt: input.occurredAt,
  };
}

function requireInterviewerTurn(turns: InterviewTurn[]) {
  const turn = turns.at(-1);
  if (!turn || turn.role !== 'interviewer') {
    throw new Error('Interview completion requires an interviewer turn');
  }
  return turn;
}

function completionResult(commandId: string, session: InterviewSession): InterviewCommandResult {
  return {
    commandId,
    sessionId: session.id,
    sessionVersion: session.version,
    eventCursor: session.eventSequence,
    replayed: false,
    session,
  };
}
