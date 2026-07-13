import { randomUUID } from 'node:crypto';
import type {
  AgentStreamEvent,
  InterviewStage,
  InterviewTurn,
  InterviewTurnRole,
} from '@interview-agent/contracts';

const TOKEN_CHUNK_CHARACTERS = 18;

export type TurnInput = {
  tenantId: string;
  sessionId: string;
  commandId: string;
  role: InterviewTurnRole;
  stage: InterviewStage;
  content: string;
  traceId: string;
  createdAt: string;
};

export type EventFactoryInput = {
  sessionId: string;
  commandId: string;
  initialSequence: number;
  stage: InterviewStage;
  content: string;
  turn: InterviewTurn;
  reportId?: string;
  traceId: string;
  occurredAt: string;
};

export function createInterviewTurn(input: TurnInput): InterviewTurn {
  return { id: `turn_${randomUUID()}`, ...input };
}

export function createInterviewEvents(input: EventFactoryInput): AgentStreamEvent[] {
  let sequence = input.initialSequence;
  const metadata = () => ({
    eventId: `${input.sessionId}:${(sequence += 1)}`,
    sessionId: input.sessionId,
    commandId: input.commandId,
    sequence,
    occurredAt: input.occurredAt,
    traceId: input.traceId,
  });
  const events: AgentStreamEvent[] = [
    { type: 'workflow_started', ...metadata() },
    { type: 'stage_changed', stage: input.stage, ...metadata() },
    ...chunkContent(input.content).map((content) => ({
      type: 'token' as const,
      content,
      ...metadata(),
    })),
    { type: 'turn_completed', turn: input.turn, ...metadata() },
  ];
  if (input.reportId) {
    events.push({ type: 'report_ready', reportId: input.reportId, ...metadata() });
  }
  return events;
}

function chunkContent(content: string) {
  const pattern = new RegExp(
    `.{1,${TOKEN_CHUNK_CHARACTERS}}(?:\\s|$)|.{1,${TOKEN_CHUNK_CHARACTERS}}`,
    'g',
  );
  const chunks = content.match(pattern) ?? [content];
  return chunks.map((chunk) => chunk.trim()).filter(Boolean);
}
