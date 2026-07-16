import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EvaluatorRubricSchema,
  MasteryProfileListSchema,
  PracticeItemSolutionSchema,
  RecentPracticeResponseSchema,
  type MasteryProfile,
  type PracticeReport,
  type PracticeSession,
  type PracticeItemSolution,
  type RecentPracticeSummary,
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

  async recent(context: ProductRequestContext): Promise<RecentPracticeSummary | null> {
    this.assertAction(context, 'practice:read', context.actor.id);
    const session = await this.prisma.practiceSession.findFirst({
      where: {
        tenantId: context.tenantId,
        userId: context.actor.id,
        status: { in: ['created', 'in_progress'] },
      },
      orderBy: { updatedAt: 'desc' },
      include: { items: { select: { answer: true } } },
    });
    if (!session) return null;
    return RecentPracticeResponseSchema.parse({
      id: session.id,
      title: session.title,
      mode: session.mode,
      status: session.status,
      questionCount: session.items.length,
      answeredCount: session.items.filter((item) => item.answer).length,
      updatedAt: session.updatedAt.toISOString(),
    });
  }

  async solution(
    context: ProductRequestContext,
    sessionId: string,
    itemId: string,
  ): Promise<PracticeItemSolution> {
    const session = await loadPracticeSession(this.prisma, sessionId, context.tenantId);
    this.assertAction(context, 'practice:read', session.userId);
    const item = session.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new NotFoundException({ code: 'PRACTICE_ITEM_NOT_FOUND' });
    if (!item.answer) throw new BadRequestException({ code: 'PRACTICE_ANSWER_REQUIRED' });
    return PracticeItemSolutionSchema.parse({
      referenceAnswer: item.question.answer,
      rubric: EvaluatorRubricSchema.parse(item.question.rubric),
    });
  }

  private assertAction(
    context: ProductRequestContext,
    action: 'practice:read' | 'mastery:read',
    ownerId: string,
  ) {
    this.policy.assert(context.actor, action, { tenantId: context.tenantId, ownerId });
  }
}
