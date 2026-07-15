import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  EvaluatorRubricSchema,
  type CreatePracticeSession,
  type PracticeReport,
  type PracticeSession,
  type SubmitPracticeAnswer,
} from '@interview-agent/contracts';
import { AuditService, jsonValue } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import { classifyRole } from '../../common/role-category';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { runSerializable } from '../../common/database/serializable-transaction';
import { PracticeEvaluator } from './practice-evaluator';
import { practiceCategoryTagFor } from './practice-question-categories';
import {
  createPracticeReportData,
  mapReport,
  mapSession,
  practiceSessionData,
  SESSION_INCLUDE,
  type SessionRecord,
} from './practice-mappers';
import { loadPracticeSession } from './practice-records';

const QUESTION_COUNT = 5;

export type PracticeAnswerCommand = {
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

type MasteryTagUpdateInput = {
  transaction: Prisma.TransactionClient;
  context: ProductRequestContext;
  sessionId: string;
  tag: string;
  scores: number[];
};

@Injectable()
export class PracticeCommandService {
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
    if (!questions.length)
      throw new BadRequestException({ code: 'PRACTICE_QUESTIONS_UNAVAILABLE' });
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

  async submitAnswer(command: PracticeAnswerCommand): Promise<void> {
    const session = await loadPracticeSession(
      this.prisma,
      command.sessionId,
      command.context.tenantId,
    );
    this.assertAction(command.context, 'practice:answer', session.userId);
    await runSerializable(this.prisma, async (transaction) => {
      const current = await loadPracticeSession(
        transaction,
        command.sessionId,
        command.context.tenantId,
      );
      this.assertAction(command.context, 'practice:answer', current.userId);
      if (current.status !== 'in_progress') throw sessionClosed();
      const item = current.items.find((candidate) => candidate.id === command.itemId);
      if (!item) throw new NotFoundException({ code: 'PRACTICE_ITEM_NOT_FOUND' });
      await transaction.practiceSessionItem.update({
        where: { tenantId_id: { tenantId: item.tenantId, id: item.id } },
        data: { answer: command.input.answer, answeredAt: new Date(), status: 'answered' },
      });
      await this.audit.record(
        command.context,
        { action: 'practice:answer', resourceType: 'PracticeSessionItem', resourceId: item.id },
        transaction,
      );
    });
  }

  async submit(context: ProductRequestContext, sessionId: string): Promise<PracticeReport> {
    const session = await loadPracticeSession(this.prisma, sessionId, context.tenantId);
    this.assertAction(context, 'practice:submit', session.userId);
    return runSerializable(this.prisma, async (transaction) => {
      const current = await loadPracticeSession(transaction, sessionId, context.tenantId);
      this.assertAction(context, 'practice:submit', current.userId);
      if (current.report) return mapReport(current.report, current.items);
      if (current.status !== 'in_progress') throw sessionClosed();
      if (current.items.some((item) => !item.answer)) {
        throw new BadRequestException({ code: 'PRACTICE_ANSWERS_INCOMPLETE' });
      }
      const claimed = await transaction.practiceSession.updateMany({
        where: { id: sessionId, tenantId: context.tenantId, status: 'in_progress' },
        data: { status: 'submitted', submittedAt: new Date() },
      });
      if (claimed.count === 0) return this.loadCompletedReport(transaction, context, sessionId);
      return this.evaluateAndReport(transaction, context, current);
    });
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
      take: QUESTION_COUNT,
    });
    if (roleTag && questions.length < QUESTION_COUNT) {
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

  private async loadCompletedReport(
    transaction: Prisma.TransactionClient,
    context: ProductRequestContext,
    sessionId: string,
  ): Promise<PracticeReport> {
    const latest = await loadPracticeSession(transaction, sessionId, context.tenantId);
    if (latest.report) return mapReport(latest.report, latest.items);
    throw sessionClosed();
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
      where: { tenantId_id: { tenantId: session.tenantId, id: session.id } },
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
      where: { tenantId_id: { tenantId: item.tenantId, id: item.id } },
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

  private async upsertMastery(input: MasteryTagUpdateInput) {
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
    if (job) return job;
    throw new BadRequestException({ code: 'JOB_INTENT_NOT_FOUND' });
  }

  private assertAction(
    context: ProductRequestContext,
    action: Parameters<PolicyService['assert']>[1],
    ownerId: string,
  ) {
    this.policy.assert(context.actor, action, { tenantId: context.tenantId, ownerId });
  }
}

function sessionClosed() {
  return new ConflictException({ code: 'PRACTICE_SESSION_CLOSED' });
}
