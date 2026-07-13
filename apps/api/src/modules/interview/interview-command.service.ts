import { HttpException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PolicyService } from '../../common/authz/policy.service';
import {
  AgentRuntimeClient,
  AgentRuntimeInvocationError,
  type AgentNextResult,
} from '../agent-runtime/agent-runtime.client';
import { buildCompletion } from './interview-command.builder';
import { InterviewCommandRepository } from './interview-command.repository';
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

@Injectable()
export class InterviewCommandService {
  private readonly logger = new Logger(InterviewCommandService.name);

  constructor(
    private readonly repository: InterviewCommandRepository,
    private readonly policy: PolicyService,
    private readonly agent: AgentRuntimeClient,
  ) {}

  start(request: StartCommandRequest) {
    this.policy.assert(request.context.actor, 'interview:create', {
      tenantId: request.context.tenantId,
      ownerId: request.context.actor.id,
    });
    return this.repository.start(request);
  }

  advance(request: AdvanceCommandRequest) {
    return this.execute({
      context: request.context,
      sessionId: request.sessionId,
      command: 'advance',
      expectedVersion: request.input.expectedVersion,
      idempotencyKey: request.idempotencyKey,
      answer: undefined,
    });
  }

  submitAnswer(request: AnswerCommandRequest) {
    return this.execute({
      context: request.context,
      sessionId: request.sessionId,
      command: 'answer',
      expectedVersion: request.input.expectedVersion,
      idempotencyKey: request.idempotencyKey,
      answer: request.input.answer,
    });
  }

  private async execute(request: ExecuteCommandRequest) {
    this.assertCommandAccess(request);
    const prepared = await this.repository.prepare(request);
    if (prepared.kind === 'replay') return prepared.result;
    let runtime: AgentNextResult | undefined;
    try {
      runtime = await this.agent.next({
        session: toRuntimeContext(prepared.session),
        ...(prepared.answer ? { answer: prepared.answer } : {}),
        traceId: prepared.context.traceId,
        commandId: prepared.commandId,
      });
      assertRuntimeDecision(prepared.session, prepared.command, runtime);
      const artifacts = buildCompletion({ preparation: prepared, runtime });
      return await this.repository.complete({
        preparation: prepared,
        runtime,
        artifacts,
      });
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
