import type {
  AdvanceInterviewInput,
  AgentStreamEvent,
  InterviewCommandResult,
  InterviewReport,
  InterviewSession,
  InterviewTurn,
  StartInterviewInput,
  SubmitInterviewAnswerInput,
} from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import type { AgentNextResult } from '../agent-runtime/agent-runtime.types';
import type { InterviewCommand } from './interview-state-machine';

export type StartCommandRequest = {
  context: ProductRequestContext;
  input: StartInterviewInput;
  idempotencyKey: string;
};

export type AdvanceCommandRequest = {
  context: ProductRequestContext;
  sessionId: string;
  input: AdvanceInterviewInput;
  idempotencyKey: string;
};

export type AnswerCommandRequest = {
  context: ProductRequestContext;
  sessionId: string;
  input: SubmitInterviewAnswerInput;
  idempotencyKey: string;
};

export type ExecuteCommandRequest = {
  context: ProductRequestContext;
  sessionId: string;
  command: InterviewCommand;
  expectedVersion: number;
  idempotencyKey: string;
  answer: string | undefined;
};

export type InvocationPreparation = ExecuteCommandRequest & {
  kind: 'invoke';
  commandId: string;
  runId: string;
  attemptCount: number;
  session: InterviewSession;
};

export type PreparedExecution =
  { kind: 'replay'; result: InterviewCommandResult } | InvocationPreparation;

export type CompletionArtifacts = {
  result: InterviewCommandResult;
  session: InterviewSession;
  turns: InterviewTurn[];
  events: AgentStreamEvent[];
  report: InterviewReport | undefined;
};

export type CompleteCommandRequest = {
  preparation: InvocationPreparation;
  runtime: AgentNextResult;
  artifacts: CompletionArtifacts;
};

export type FailureTelemetry = {
  code: string;
  latencyMs: number | undefined;
  attempts: number | undefined;
  schemaValid: boolean | null | undefined;
  fallbackUsed: boolean;
};

export type FailCommandRequest = {
  preparation: InvocationPreparation;
  telemetry: FailureTelemetry;
};
