import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { InterviewCommandResult } from '@interview-agent/contracts';
import { InterviewCommandCompletionHandler } from './interview-command-completion.handler';
import { InterviewCommandLeaseHandler } from './interview-command-lease.handler';
import { InterviewCommandStartHandler } from './interview-command-start.handler';
import type {
  CompleteCommandRequest,
  ExecuteCommandRequest,
  FailCommandRequest,
  PreparedExecution,
  StartCommandRequest,
} from './interview.types';

@Injectable()
export class InterviewCommandHandlers {
  constructor(
    private readonly startHandler: InterviewCommandStartHandler,
    private readonly leaseHandler: InterviewCommandLeaseHandler,
    private readonly completionHandler: InterviewCommandCompletionHandler,
  ) {}

  start(
    transaction: Prisma.TransactionClient,
    request: StartCommandRequest,
  ): Promise<InterviewCommandResult> {
    return this.startHandler.execute(transaction, request);
  }

  prepare(
    transaction: Prisma.TransactionClient,
    request: ExecuteCommandRequest,
  ): Promise<PreparedExecution> {
    return this.leaseHandler.execute(transaction, request);
  }

  complete(
    transaction: Prisma.TransactionClient,
    request: CompleteCommandRequest,
  ): Promise<InterviewCommandResult> {
    return this.completionHandler.complete(transaction, request);
  }

  fail(transaction: Prisma.TransactionClient, request: FailCommandRequest): Promise<void> {
    return this.completionHandler.fail(transaction, request);
  }
}
