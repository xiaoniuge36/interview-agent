import { Injectable, NotFoundException } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import {
  CONTRACT_LIMITS,
  InterviewListSchema,
  type InterviewReport,
  type InterviewSession,
} from '@interview-agent/contracts';
import type { Observable } from 'rxjs';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { InterviewEventBus } from '../../common/events/interview-event.bus';
import { mapReport, mapSession } from './interview.mapper';

const INTERVIEW_LIST_LIMIT = 200;

@Injectable()
export class InterviewQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly events: InterviewEventBus,
  ) {}

  async list(context: ProductRequestContext): Promise<InterviewSession[]> {
    this.assertRead(context);
    const records = await this.prisma.interviewSession.findMany({
      where: ownerScope(context),
      include: { turns: orderedTurns() },
      orderBy: { updatedAt: 'desc' },
      take: INTERVIEW_LIST_LIMIT,
    });
    return InterviewListSchema.parse(records.map(mapSession));
  }

  async get(context: ProductRequestContext, sessionId: string): Promise<InterviewSession> {
    this.assertRead(context);
    const record = await this.prisma.interviewSession.findFirst({
      where: { ...ownerScope(context), id: sessionId },
      include: { turns: orderedTurns() },
    });
    if (!record) throw sessionNotFound();
    return mapSession(record);
  }

  async report(context: ProductRequestContext, sessionId: string): Promise<InterviewReport> {
    await this.requireOwnedSession(context, sessionId, 'interview:read');
    const report = await this.prisma.interviewReport.findUnique({
      where: {
        tenantId_sessionId: { tenantId: context.tenantId, sessionId },
      },
    });
    if (!report) throw new NotFoundException('InterviewReport not found');
    return mapReport(report);
  }

  async stream(input: {
    context: ProductRequestContext;
    sessionId: string;
    afterSequence: number;
  }): Promise<Observable<MessageEvent>> {
    await this.requireOwnedSession(input.context, input.sessionId, 'interview:stream');
    return this.events.stream(input.context.tenantId, input.sessionId, input.afterSequence);
  }

  private assertRead(context: ProductRequestContext) {
    this.policy.assert(context.actor, 'interview:read', {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
  }

  private async requireOwnedSession(
    context: ProductRequestContext,
    sessionId: string,
    action: 'interview:read' | 'interview:stream',
  ) {
    this.policy.assert(context.actor, action, {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
    const record = await this.prisma.interviewSession.findFirst({
      where: { ...ownerScope(context), id: sessionId },
      select: { id: true },
    });
    if (!record) throw sessionNotFound();
  }
}

function ownerScope(context: ProductRequestContext) {
  return {
    tenantId: context.tenantId,
    userId: context.actor.id,
  };
}

function orderedTurns() {
  return {
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
    take: CONTRACT_LIMITS.turns,
  };
}

function sessionNotFound() {
  return new NotFoundException('InterviewSession not found');
}
