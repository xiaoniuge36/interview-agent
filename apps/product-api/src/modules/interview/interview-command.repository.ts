import { Injectable } from '@nestjs/common';
import type { InterviewCommandResult } from '@interview-agent/contracts';
import { PrismaService } from '../../common/database/prisma.service';
import {
  isUniqueConstraintError,
  runSerializable,
} from '../../common/database/serializable-transaction';
import { InterviewEventBus } from '../../common/events/interview-event.bus';
import { InterviewCommandHandlers } from './interview-command.handlers';
import type {
  CompleteCommandRequest,
  ExecuteCommandRequest,
  FailCommandRequest,
  PreparedExecution,
  StartCommandRequest,
} from './interview.types';

@Injectable()
export class InterviewCommandRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly handlers: InterviewCommandHandlers,
    private readonly events: InterviewEventBus,
  ) {}

  start(request: StartCommandRequest): Promise<InterviewCommandResult> {
    return this.retryUniqueCollision(() =>
      runSerializable(this.prisma, (transaction) => this.handlers.start(transaction, request)),
    );
  }

  prepare(request: ExecuteCommandRequest): Promise<PreparedExecution> {
    return this.retryUniqueCollision(() =>
      runSerializable(this.prisma, (transaction) => this.handlers.prepare(transaction, request)),
    );
  }

  async complete(request: CompleteCommandRequest): Promise<InterviewCommandResult> {
    const result = await runSerializable(this.prisma, (transaction) =>
      this.handlers.complete(transaction, request),
    );
    await this.events.publishMany({
      tenantId: request.preparation.context.tenantId,
      events: request.artifacts.events,
    });
    return result;
  }

  async fail(request: FailCommandRequest): Promise<void> {
    await runSerializable(this.prisma, (transaction) => this.handlers.fail(transaction, request));
  }

  private async retryUniqueCollision<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      return operation();
    }
  }
}
