import { HttpException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { AiOperationPhase, InterviewCommandResult } from '@interview-agent/contracts';
import {
  AgentRuntimeInvocationError,
  type AgentNextResult,
} from '../agent-runtime/agent-runtime.client';
import { buildCompletion } from './interview-command.builder';
import { InterviewCommandInfrastructure } from './interview-command-infrastructure';
import { InterviewRetrievalContextService } from './interview-retrieval-context.service';
import { toRuntimeContext } from './interview.mapper';
import { assertRuntimeDecision } from './interview-state-machine';
import type {
  AdvanceCommandRequest,
  AnswerCommandRequest,
  ExecuteCommandRequest,
  FailureTelemetry,
  InvocationPreparation,
  StartCommandRequest,
} from './interview.types';

export type InterviewCommandStream = {
  phase: (phase: AiOperationPhase) => void;
  delta: (content: string) => void;
  signal?: AbortSignal;
};

export type InterviewStreamCommandResult = {
  result: InterviewCommandResult;
  basisSummary: string[];
};
const MAX_BASIS_SUMMARY_ITEMS = 3;

@Injectable()
export class InterviewCommandService {
  private readonly logger = new Logger(InterviewCommandService.name);

  constructor(
    private readonly infrastructure: InterviewCommandInfrastructure,
    private readonly retrieval: InterviewRetrievalContextService,
  ) {}

  private get repository() {
    return this.infrastructure.repository;
  }

  private get policy() {
    return this.infrastructure.policy;
  }

  private get agent() {
    return this.infrastructure.agent;
  }

  start(request: StartCommandRequest) {
    this.policy.assert(request.context.actor, 'interview:create', {
      tenantId: request.context.tenantId,
      ownerId: request.context.actor.id,
    });
    return this.repository.start(request);
  }

  async advance(request: AdvanceCommandRequest) {
    const execution = await this.execute({
      context: request.context,
      sessionId: request.sessionId,
      command: 'advance',
      expectedVersion: request.input.expectedVersion,
      idempotencyKey: request.idempotencyKey,
      answer: undefined,
    });
    return execution.result;
  }

  async submitAnswer(request: AnswerCommandRequest) {
    const execution = await this.execute({
      context: request.context,
      sessionId: request.sessionId,
      command: 'answer',
      expectedVersion: request.input.expectedVersion,
      idempotencyKey: request.idempotencyKey,
      answer: request.input.answer,
    });
    return execution.result;
  }

  advanceStream(request: AdvanceCommandRequest, stream: InterviewCommandStream) {
    return this.execute(
      {
        context: request.context,
        sessionId: request.sessionId,
        command: 'advance',
        expectedVersion: request.input.expectedVersion,
        idempotencyKey: request.idempotencyKey,
        answer: undefined,
      },
      stream,
    );
  }

  submitAnswerStream(request: AnswerCommandRequest, stream: InterviewCommandStream) {
    return this.execute(
      {
        context: request.context,
        sessionId: request.sessionId,
        command: 'answer',
        expectedVersion: request.input.expectedVersion,
        idempotencyKey: request.idempotencyKey,
        answer: request.input.answer,
      },
      stream,
    );
  }

  private async execute(
    request: ExecuteCommandRequest,
    stream?: InterviewCommandStream,
  ): Promise<InterviewStreamCommandResult> {
    this.assertCommandAccess(request);
    const prepared = await this.repository.prepare(request);
    if (prepared.kind === 'replay') {
      return { result: prepared.result, basisSummary: basisSummary(prepared.result) };
    }
    let runtime: AgentNextResult | undefined;
    try {
      stream?.phase('preparing');
      stream?.phase('analyzing');
      stream?.phase('composing');
      const retrievalContext = await this.retrieval.forCommand(prepared);
      runtime = await invokeRuntime({
        agent: this.agent,
        preparation: prepared,
        retrievalContext,
        stream,
      });
      stream?.phase('validating');
      assertRuntimeDecision(prepared.session, prepared.command, runtime);
      const artifacts = buildCompletion({ preparation: prepared, runtime });
      stream?.phase('saving');
      const result = await this.repository.complete({
        preparation: prepared,
        runtime,
        artifacts,
      });
      return { result, basisSummary: runtime.basisSummary ?? [] };
    } catch (error) {
      await this.recordFailure(prepared, error, runtime);
      throw this.publicError(error, prepared.context.traceId);
    }
  }

  private assertCommandAccess(request: ExecuteCommandRequest) {
    const action = request.command === 'advance' ? 'interview:advance' : 'interview:answer';
    this.policy.assert(request.context.actor, action, {
      tenantId: request.context.tenantId,
      ownerId: request.context.actor.id,
    });
  }

  private async recordFailure(
    preparation: InvocationPreparation,
    error: unknown,
    runtime: AgentNextResult | undefined,
  ) {
    try {
      await this.repository.fail({
        preparation,
        telemetry: failureTelemetry(error, runtime),
      });
    } catch (failureError) {
      this.logger.error(
        `Failed to persist command failure traceId=${preparation.context.traceId}`,
        failureError instanceof Error ? failureError.stack : undefined,
      );
    }
  }

  private publicError(error: unknown, traceId: string) {
    if (error instanceof HttpException) return error;
    this.logger.error(
      `Interview command failed traceId=${traceId}`,
      error instanceof Error ? error.stack : undefined,
    );
    return new ServiceUnavailableException({
      code: 'INTERVIEW_COMMAND_FAILED',
      message: '面试命令暂时无法完成，请稍后重试。',
    });
  }
}

function invokeRuntime(command: {
  agent: InterviewCommandInfrastructure['agent'];
  preparation: InvocationPreparation;
  retrievalContext: Awaited<ReturnType<InterviewRetrievalContextService['forCommand']>>;
  stream: InterviewCommandStream | undefined;
}) {
  const request = {
    session: toRuntimeContext(command.preparation.session),
    ...(command.preparation.answer ? { answer: command.preparation.answer } : {}),
    ...(command.retrievalContext.length ? { retrievalContext: command.retrievalContext } : {}),
    traceId: command.preparation.context.traceId,
    commandId: command.preparation.commandId,
  };
  if (!command.stream) return command.agent.next(request, command.preparation.context);
  return command.agent.next(request, command.preparation.context, streamProgress(command.stream));
}

function streamProgress(stream: InterviewCommandStream) {
  return {
    onContentDelta: stream.delta,
    ...(stream.signal ? { signal: stream.signal } : {}),
  };
}

function basisSummary(result: InterviewCommandResult): string[] {
  const payload = result.session.turns.at(-1)?.structuredPayload;
  const summary = payload?.basisSummary;
  if (!Array.isArray(summary)) return [];
  return summary
    .filter((item): item is string => typeof item === 'string')
    .slice(0, MAX_BASIS_SUMMARY_ITEMS);
}

function failureTelemetry(error: unknown, runtime: AgentNextResult | undefined): FailureTelemetry {
  if (error instanceof AgentRuntimeInvocationError) {
    return { ...error.telemetry, fallbackUsed: false };
  }
  return {
    code: exceptionCode(error),
    latencyMs: runtime?.latencyMs,
    attempts: runtime?.attempts,
    schemaValid: runtime?.schemaValid,
    fallbackUsed: runtime?.fallbackUsed ?? false,
  };
}

function exceptionCode(error: unknown) {
  if (!(error instanceof HttpException)) return 'INTERVIEW_COMMAND_PROCESSING_FAILED';
  const response = error.getResponse();
  if (typeof response === 'object' && response !== null) {
    const code = (response as Record<string, unknown>).code;
    if (typeof code === 'string') return code;
  }
  return 'INTERVIEW_COMMAND_REJECTED';
}
