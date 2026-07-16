import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  type CreatePracticeSession,
  type PracticeSession,
  type SubmitPracticeAnswer,
} from '@interview-agent/contracts';
import { AuditService } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import { classifyRole } from '../../common/role-category';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { runSerializable } from '../../common/database/serializable-transaction';
import { practiceCategoryTagFor } from './practice-question-categories';
import {
  mapSession,
  practiceSessionData,
  SESSION_INCLUDE,
} from './practice-mappers';
import { loadPracticeSession } from './practice-records';

const QUESTION_COUNT = 5;

export type PracticeAnswerCommand = {
  context: ProductRequestContext;
  sessionId: string;
  itemId: string;
  input: SubmitPracticeAnswer;
};

@Injectable()
export class PracticeCommandService {
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
          metadata: { questionCount: questions.length, mode: input.mode ?? 'smart' },
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
      if (item.evaluation && item.answer !== command.input.answer) {
        await transaction.evaluationResult.deleteMany({
          where: { tenantId: command.context.tenantId, sessionItemId: item.id },
        });
      }
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
