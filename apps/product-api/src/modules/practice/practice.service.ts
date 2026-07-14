import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  EvaluatorRubricSchema,
  MasteryProfileListSchema,
  type CreatePracticeSession,
  type MasteryProfile,
  type PracticeReport,
  type PracticeSession,
  type SubmitPracticeAnswer,
} from '@interview-agent/contracts';
import { AuditService, jsonValue } from '../../common/audit/audit.service';
import { classifyRole } from '../../common/role-category';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { PracticeEvaluator } from './practice-evaluator';
import { isPracticeCategoryTag, practiceCategoryTagFor } from './practice-question-categories';
import {
  createPracticeReportData,
  mapMastery,
  mapReport,
  mapSession,
  practiceSessionData,
  SESSION_INCLUDE,
  type SessionRecord,
} from './practice-mappers';
const LIMITS = { questionCount: 5, masteryList: 200 } as const;
type PracticeAnswerCommand = {
  context: ProductRequestContext;
  sessionId: string;
  itemId: string;
  input: SubmitPracticeAnswer;
};
type MasteryUpdateInput = {
  transaction: Prisma.TransactionClient;
  context: ProductRequestContext;
  session: SessionRecord;
  evaluations: Array<{ score: number }>;
};
type MasteryUpsertInput = {
  transaction: Prisma.TransactionClient;
  context: ProductRequestContext;
  sessionId: string;
  tag: string;
  scores: number[];
};
@Injectable()
export class PracticeService {
  private readonly evaluator = new PracticeEvaluator();
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}
  async create(
    context: ProductRequestContext,
    input: CreatePracticeSession,
  ): Promise<PracticeSession> {
    this.assertAction(context, 'practice:create', context.actor.id);
    const questions = await this.selectQuestions(context, input);
    if (!questions.length) {
      throw new BadRequestException({ code: 'PRACTICE_QUESTIONS_UNAVAILABLE' });
    }
    return this.prisma.$transaction(async (transaction) => {
      const session = await transaction.practiceSession.create({
        data: practiceSessionData(context, input, questions),
        include: SESSION_INCLUDE,
      });
      await this.audit.record(
        context,
        {
          action: 'practice:create',
          resourceType: 'PracticeSession',
          resourceId: session.id,
          metadata: { questionCount: questions.length, evaluatorMode: 'deterministic_fallback' },
        },
        transaction,
      );
      return mapSession(session);
    });
  }
  async get(context: ProductRequestContext, sessionId: string): Promise<PracticeSession> {
    const session = await this.loadSession(sessionId, context.tenantId);
    this.assertAction(context, 'practice:read', session.userId);
    return mapSession(session);
  }
  async submitAnswer(command: PracticeAnswerCommand): Promise<PracticeSession> {
    const { context, sessionId, itemId, input } = command;
    const session = await this.loadSession(sessionId, context.tenantId);
    this.assertAction(context, 'practice:answer', session.userId);
    if (session.status !== 'in_progress') {
      throw new ConflictException({ code: 'PRACTICE_SESSION_CLOSED' });
    }
    const item = session.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new NotFoundException({ code: 'PRACTICE_ITEM_NOT_FOUND' });
    await this.prisma.$transaction(async (transaction) => {
      await transaction.practiceSessionItem.update({
        where: { id: item.id },
        data: { answer: input.answer, answeredAt: new Date(), status: 'answered' },
      });
      await this.audit.record(
        context,
        {
          action: 'practice:answer',
          resourceType: 'PracticeSessionItem',
          resourceId: item.id,
        },
        transaction,
      );
    });
    return this.get(context, sessionId);
  }
  async submit(context: ProductRequestContext, sessionId: string): Promise<PracticeReport> {
    const session = await this.loadSession(sessionId, context.tenantId);
    this.assertAction(context, 'practice:submit', session.userId);
    if (session.report) return this.getReport(context, sessionId);
    if (session.status !== 'in_progress') {
      throw new ConflictException({ code: 'PRACTICE_SESSION_CLOSED' });
    }
    if (session.items.some((item) => !item.answer)) {
      throw new BadRequestException({ code: 'PRACTICE_ANSWERS_INCOMPLETE' });
    }
    return this.prisma.$transaction((transaction) =>
      this.evaluateAndReport(transaction, context, session),
    );
  }
  async getReport(context: ProductRequestContext, sessionId: string): Promise<PracticeReport> {
    const session = await this.loadSession(sessionId, context.tenantId);
    this.assertAction(context, 'practice:read', session.userId);
    if (!session.report) throw new NotFoundException({ code: 'PRACTICE_REPORT_NOT_READY' });
    return mapReport(session.report, session.items);
  }
  async mastery(context: ProductRequestContext): Promise<MasteryProfile[]> {
    this.assertAction(context, 'mastery:read', context.actor.id);
    const records = await this.prisma.masteryProfile.findMany({
      where: { tenantId: context.tenantId, userId: context.actor.id },
      orderBy: { updatedAt: 'desc' },
      take: LIMITS.masteryList,
    });
    return MasteryProfileListSchema.parse(
      records.filter((record) => !isPracticeCategoryTag(record.tag)).map(mapMastery),
    );
  }
  private async selectQuestions(context: ProductRequestContext, input: CreatePracticeSession) {
    const job = input.jobIntentId ? await this.findJobIntent(context, input.jobIntentId) : null;
    const where: Prisma.QuestionWhereInput = {
      status: 'published',
      OR: [{ tenantId: context.tenantId }, { visibility: 'public' }],
    };
    if (input.questionIds?.length) return this.selectedQuestions(where, input.questionIds);
    const roleTag = job ? practiceCategoryTagFor(classifyRole(job.targetRole)) : null;
    const questions = await this.prisma.question.findMany({
      where: roleTag ? { ...where, tags: { has: roleTag } } : where,
      orderBy: { updatedAt: 'desc' },
      take: LIMITS.questionCount,
    });
    if (roleTag && questions.length < LIMITS.questionCount) {
      throw new BadRequestException({ code: 'PRACTICE_ROLE_QUESTIONS_UNAVAILABLE' });
    }
    return questions;
  }
  private async selectedQuestions(where: Prisma.QuestionWhereInput, ids: string[]) {
    const questions = await this.prisma.question.findMany({ where: { ...where, id: { in: ids } } });
    if (questions.length !== ids.length) {
      throw new BadRequestException({ code: 'PRACTICE_QUESTION_SELECTION_INVALID' });
    }
    return ids.map((id) => questions.find((question) => question.id === id)!);
  }
  private async evaluateAndReport(
    transaction: Prisma.TransactionClient,
    context: ProductRequestContext,
    session: SessionRecord,
  ): Promise<PracticeReport> {
    const evaluations = await Promise.all(
      session.items.map((item) => this.persistEvaluation(transaction, item)),
    );
    await this.updateMastery({ transaction, context, session, evaluations });
    const report = await transaction.practiceReport.create({
      data: createPracticeReportData(session, evaluations),
    });
    await transaction.practiceSession.update({
      where: { id: session.id },
      data: { status: 'report_ready', submittedAt: new Date(), reportedAt: new Date() },
    });
    await this.audit.record(
      context,
      {
        action: 'practice:submit',
        resourceType: 'PracticeSession',
        resourceId: session.id,
        metadata: { evaluatorMode: 'deterministic_fallback', overallScore: report.overallScore },
      },
      transaction,
    );
    return mapReport(
      report,
      session.items.map((item, index) => ({ ...item, evaluation: evaluations[index] ?? null })),
    );
  }
  private async persistEvaluation(
    transaction: Prisma.TransactionClient,
    item: SessionRecord['items'][number],
  ) {
    const rubric = EvaluatorRubricSchema.parse(item.question.rubric);
    const evaluation = this.evaluator.evaluate({
      answer: item.answer ?? '',
      referenceAnswer: item.question.answer,
      rubric,
      tags: item.question.tags,
    });
    await transaction.practiceSessionItem.update({
      where: { id: item.id },
      data: { status: 'evaluated' },
    });
    return transaction.evaluationResult.create({
      data: {
        tenantId: item.tenantId,
        sessionItemId: item.id,
        score: evaluation.score,
        feedback: evaluation.feedback,
        missingPoints: evaluation.missingPoints,
        rubricScores: jsonValue(evaluation.rubricScores),
      },
    });
  }
  private async updateMastery(input: MasteryUpdateInput) {
    const scoreByTag = new Map<string, number[]>();
    input.session.items.forEach((item, index) => {
      item.question.tags.forEach((tag) => {
        const scores = scoreByTag.get(tag) ?? [];
        scoreByTag.set(tag, [...scores, input.evaluations[index]!.score]);
      });
    });
    for (const [tag, scores] of scoreByTag) {
      await this.upsertMastery({
        transaction: input.transaction,
        context: input.context,
        sessionId: input.session.id,
        tag,
        scores,
      });
    }
  }
  private async upsertMastery(input: MasteryUpsertInput) {
    const identity = {
      tenantId: input.context.tenantId,
      userId: input.context.actor.id,
      tag: input.tag,
    };
    const current = await input.transaction.masteryProfile.findUnique({
      where: { tenantId_userId_tag: identity },
    });
    const evidenceCount = (current?.evidenceCount ?? 0) + input.scores.length;
    const priorTotal = (current?.score ?? 0) * (current?.evidenceCount ?? 0);
    const score =
      (priorTotal + input.scores.reduce((sum, value) => sum + value, 0)) / evidenceCount;
    await input.transaction.masteryProfile.upsert({
      where: { tenantId_userId_tag: identity },
      create: { ...identity, score, evidenceCount, lastEvidenceSessionId: input.sessionId },
      update: { score, evidenceCount, lastEvidenceSessionId: input.sessionId },
    });
  }
  private async findJobIntent(context: ProductRequestContext, jobIntentId: string) {
    const job = await this.prisma.jobIntent.findFirst({
      where: { id: jobIntentId, tenantId: context.tenantId, userId: context.actor.id },
      select: { targetRole: true },
    });
    if (!job) throw new BadRequestException({ code: 'JOB_INTENT_NOT_FOUND' });
    return job;
  }
  private async loadSession(sessionId: string, tenantId: string): Promise<SessionRecord> {
    const session = await this.prisma.practiceSession.findFirst({
      where: { id: sessionId, tenantId },
      include: SESSION_INCLUDE,
    });
    if (session) return session;
    throw new NotFoundException({ code: 'PRACTICE_SESSION_NOT_FOUND' });
  }
  private assertAction(
    context: ProductRequestContext,
    action: Parameters<PolicyService['assert']>[1],
    ownerId: string,
  ) {
    this.policy.assert(context.actor, action, { tenantId: context.tenantId, ownerId });
  }
}
