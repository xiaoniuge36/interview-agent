import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { CONTRACT_LIMITS, type InterviewSession } from '@interview-agent/contracts';
import { randomUUID } from 'node:crypto';
import { jsonValue } from '../../common/audit/audit.service';
import type { Environment } from '../../common/config/environment';
import { mapCommandResult, mapSession } from './interview.mapper';
import {
  assertFingerprint,
  commandFailed,
  commandInProgress,
  executionFingerprint,
  hasActiveLease,
} from './interview-command.errors';
import { findIdempotentCommand, runInput } from './interview-command.records';
import { assertInterviewCommand } from './interview-state-machine';
import type {
  ExecuteCommandRequest,
  InvocationPreparation,
  PreparedExecution,
} from './interview.types';

const EXPIRED_LEASE_CODE = 'INTERVIEW_COMMAND_LEASE_EXPIRED';

@Injectable()
export class InterviewCommandLeaseHandler {
  private readonly leaseMilliseconds: number;

  constructor(config: ConfigService<Environment, true>) {
    this.leaseMilliseconds = config.get('INTERVIEW_COMMAND_LEASE_MS', {
      infer: true,
    });
  }

  async execute(
    transaction: Prisma.TransactionClient,
    request: ExecuteCommandRequest,
  ): Promise<PreparedExecution> {
    const fingerprint = executionFingerprint(request);
    const existing = await findIdempotentCommand(
      transaction,
      request.context,
      request.idempotencyKey,
    );
    if (existing) {
      return this.prepareExisting({ transaction, request, existing, fingerprint });
    }
    const session = await this.requireOwnedSession(transaction, request);
    assertInterviewCommand(session, request.command, request.expectedVersion);
    return this.createPending({ transaction, request, session, fingerprint });
  }

  private async prepareExisting(input: {
    transaction: Prisma.TransactionClient;
    request: ExecuteCommandRequest;
    existing: Prisma.InterviewCommandGetPayload<object>;
    fingerprint: string;
  }): Promise<PreparedExecution> {
    assertFingerprint(input.existing.fingerprint, input.fingerprint);
    if (input.existing.status === 'completed') {
      return {
        kind: 'replay',
        result: mapCommandResult(input.existing.result, true),
      };
    }
    if (input.existing.status === 'failed') {
      throw commandFailed(input.existing.errorCode);
    }
    if (hasActiveLease(input.existing.leaseExpiresAt)) throw commandInProgress();
    const session = await this.requireOwnedSession(input.transaction, input.request);
    assertInterviewCommand(session, input.request.command, input.request.expectedVersion);
    return this.reclaim({ ...input, session });
  }

  private async createPending(input: {
    transaction: Prisma.TransactionClient;
    request: ExecuteCommandRequest;
    session: InterviewSession;
    fingerprint: string;
  }): Promise<InvocationPreparation> {
    const commandId = `command_${randomUUID()}`;
    const commandAttempt = 1;
    await input.transaction.interviewCommand.create({
      data: {
        id: commandId,
        tenantId: input.request.context.tenantId,
        sessionId: input.request.sessionId,
        actorId: input.request.context.actor.id,
        idempotencyKey: input.request.idempotencyKey,
        fingerprint: input.fingerprint,
        type: input.request.command,
        expectedVersion: input.request.expectedVersion,
        traceId: input.request.context.traceId,
        attemptCount: commandAttempt,
        leaseExpiresAt: this.leaseExpiration(),
      },
    });
    return this.createRun({ ...input, commandId, commandAttempt });
  }

  private async reclaim(input: {
    transaction: Prisma.TransactionClient;
    request: ExecuteCommandRequest;
    existing: Prisma.InterviewCommandGetPayload<object>;
    session: InterviewSession;
  }): Promise<InvocationPreparation> {
    const commandAttempt = input.existing.attemptCount + 1;
    const claimed = await input.transaction.interviewCommand.updateMany({
      where: {
        id: input.existing.id,
        tenantId: input.request.context.tenantId,
        status: 'pending',
        attemptCount: input.existing.attemptCount,
        OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: new Date() } }],
      },
      data: {
        attemptCount: { increment: 1 },
        leaseExpiresAt: this.leaseExpiration(),
      },
    });
    if (claimed.count === 0) throw commandInProgress();
    await input.transaction.agentRun.updateMany({
      where: {
        tenantId: input.request.context.tenantId,
        commandId: input.existing.id,
        status: 'running',
      },
      data: { status: 'failed', error: EXPIRED_LEASE_CODE },
    });
    return this.createRun({
      transaction: input.transaction,
      request: input.request,
      session: input.session,
      commandId: input.existing.id,
      commandAttempt,
    });
  }

  private async createRun(input: {
    transaction: Prisma.TransactionClient;
    request: ExecuteCommandRequest;
    session: InterviewSession;
    commandId: string;
    commandAttempt: number;
  }): Promise<InvocationPreparation> {
    const runId = `run_${randomUUID()}`;
    await input.transaction.agentRun.create({
      data: {
        id: runId,
        tenantId: input.request.context.tenantId,
        sessionId: input.request.sessionId,
        commandId: input.commandId,
        type: 'mock_interview',
        status: 'running',
        stage: input.session.stage,
        traceId: input.request.context.traceId,
        input: jsonValue(runInput(input.request, input.session, input.commandAttempt)),
      },
    });
    return {
      ...input.request,
      kind: 'invoke',
      commandId: input.commandId,
      runId,
      attemptCount: input.commandAttempt,
      session: input.session,
    };
  }

  private async requireOwnedSession(
    transaction: Prisma.TransactionClient,
    request: ExecuteCommandRequest,
  ) {
    const session = await transaction.interviewSession.findFirst({
      where: {
        id: request.sessionId,
        tenantId: request.context.tenantId,
        userId: request.context.actor.id,
      },
      include: {
        turns: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: CONTRACT_LIMITS.turns,
        },
      },
    });
    if (!session) throw new NotFoundException('InterviewSession not found');
    return mapSession(session);
  }

  private leaseExpiration() {
    return new Date(Date.now() + this.leaseMilliseconds);
  }
}
