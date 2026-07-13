import { BadGatewayException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { AgentRuntimeSessionContext, InterviewStage } from '@interview-agent/contracts';

export type RuntimeFailureKind = 'rejected' | 'schema' | 'unavailable';

export type RuntimeFailure = {
  kind: RuntimeFailureKind;
  code: string;
  retryable: boolean;
  schemaValid: boolean | null;
};

export type AgentNextDecision = {
  stage: InterviewStage;
  content: string;
  shouldFinish: boolean;
};

export type AgentNextResult = AgentNextDecision & {
  latencyMs: number;
  attempts: number;
  fallbackUsed: boolean;
  schemaValid: boolean | null;
};

export type AgentNextInput = {
  session: AgentRuntimeSessionContext;
  answer?: string;
  traceId: string;
  commandId: string;
};

export type AgentRuntimeFailureTelemetry = {
  latencyMs: number;
  attempts: number;
  schemaValid: boolean | null;
  code: string;
};

export type RuntimeInvocationOutcome = { decision: AgentNextDecision } | RuntimeFailure;

export class AgentRuntimeInvocationError extends HttpException {
  readonly telemetry: AgentRuntimeFailureTelemetry;

  constructor(input: {
    telemetry: AgentRuntimeFailureTelemetry;
    exception: BadGatewayException | ServiceUnavailableException;
  }) {
    super(input.exception.getResponse(), input.exception.getStatus());
    this.telemetry = input.telemetry;
    this.name = AgentRuntimeInvocationError.name;
  }
}
