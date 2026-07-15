import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MasteryProfileListSchema,
  type MasteryProfile,
  type PracticeReport,
  type PracticeSession,
} from '@interview-agent/contracts';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { isPracticeCategoryTag } from './practice-question-categories';
import { mapMastery, mapReport, mapSession } from './practice-mappers';
import { loadPracticeSession } from './practice-records';

const MASTERY_LIST_LIMIT = 200;

@Injectable()
export class PracticeQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async get(context: ProductRequestContext, sessionId: string): Promise<PracticeSession> {
    const session = await loadPracticeSession(this.prisma, sessionId, context.tenantId);
    this.assertAction(context, 'practice:read', session.userId);
    return mapSession(session);
  }

  async getReport(context: ProductRequestContext, sessionId: string): Promise<PracticeReport> {
    const session = await loadPracticeSession(this.prisma, sessionId, context.tenantId);
    this.assertAction(context, 'practice:read', session.userId);
    if (session.report) return mapReport(session.report, session.items);
    throw new NotFoundException({ code: 'PRACTICE_REPORT_NOT_READY' });
  }

  async mastery(context: ProductRequestContext): Promise<MasteryProfile[]> {
    this.assertAction(context, 'mastery:read', context.actor.id);
    const records = await this.prisma.masteryProfile.findMany({
      where: { tenantId: context.tenantId, userId: context.actor.id },
      orderBy: { updatedAt: 'desc' },
      take: MASTERY_LIST_LIMIT,
    });
    return MasteryProfileListSchema.parse(
      records.filter((record) => !isPracticeCategoryTag(record.tag)).map(mapMastery),
    );
  }

  private assertAction(
    context: ProductRequestContext,
    action: 'practice:read' | 'mastery:read',
    ownerId: string,
  ) {
    this.policy.assert(context.actor, action, { tenantId: context.tenantId, ownerId });
  }
}
