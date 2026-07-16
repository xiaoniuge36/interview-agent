import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EvaluatorRubricSchema,
  PracticeItemFeedbackSchema,
  type PracticeItemFeedback,
} from '@interview-agent/contracts';
import { jsonValue } from '../../common/audit/audit.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { runSerializable } from '../../common/database/serializable-transaction';
import { PracticeEvaluationInfrastructure } from './practice-evaluation-infrastructure';
import { visiblePracticeTags } from './practice-question-categories';
import { PracticeModelEvaluator } from './practice-model-evaluator';
import { mapEvaluation } from './practice-mappers';
import { loadPracticeSession } from './practice-records';

export type PracticeEvaluationCommand = {
  context: ProductRequestContext;
  sessionId: string;
  itemId: string;
};

@Injectable()
export class PracticeEvaluationCommandService {
  constructor(
    private readonly infrastructure: PracticeEvaluationInfrastructure,
    private readonly model: PracticeModelEvaluator,
  ) {}

  async evaluate(command: PracticeEvaluationCommand): Promise<PracticeItemFeedback> {
    const session = await loadPracticeSession(
      this.infrastructure.prisma,
      command.sessionId,
      command.context.tenantId,
    );
    this.assertAction(command.context, session.userId);
    const item = evaluableItem(session, command.itemId);
    const rubric = EvaluatorRubricSchema.parse(item.question.rubric);
    if (item.evaluation) return feedback(item.question.answer, rubric, item.evaluation);
    const targetRole = await this.targetRole(command.context, session.jobIntentId);
    const draft = await this.model.evaluate(command.context, {
      title: item.question.title,
      stem: item.question.stem,
      answer: item.answer!,
      referenceAnswer: item.question.answer,
      rubric,
      tags: visiblePracticeTags(item.question.tags),
      ...(targetRole ? { targetRole } : {}),
    });
    return runSerializable(this.infrastructure.prisma, async (transaction) => {
      const current = await loadPracticeSession(
        transaction,
        command.sessionId,
        command.context.tenantId,
      );
      const currentItem = evaluableItem(current, command.itemId);
      if (currentItem.answer !== item.answer) throw answerChanged();
      const evaluation = await transaction.evaluationResult.upsert({
        where: {
          tenantId_sessionItemId: {
            tenantId: command.context.tenantId,
            sessionItemId: currentItem.id,
          },
        },
        create: evaluationData(command.context.tenantId, currentItem.id, draft),
        update: evaluationUpdate(draft),
      });
      await transaction.practiceSessionItem.update({
        where: { tenantId_id: { tenantId: currentItem.tenantId, id: currentItem.id } },
        data: { status: 'evaluated' },
      });
      await this.infrastructure.audit.record(
        command.context,
        { action: 'practice:evaluate', resourceType: 'PracticeSessionItem', resourceId: item.id },
        transaction,
      );
      return feedback(item.question.answer, rubric, evaluation);
    });
  }

  private targetRole(context: ProductRequestContext, jobIntentId: string | null) {
    if (!jobIntentId) return undefined;
    return this.infrastructure.prisma.jobIntent
      .findFirst({
        where: { id: jobIntentId, tenantId: context.tenantId, userId: context.actor.id },
        select: { targetRole: true },
      })
      .then((job) => job?.targetRole);
  }

  private assertAction(context: ProductRequestContext, ownerId: string) {
    this.infrastructure.policy.assert(context.actor, 'practice:answer', {
      tenantId: context.tenantId,
      ownerId,
    });
  }
}

function evaluableItem(session: Awaited<ReturnType<typeof loadPracticeSession>>, itemId: string) {
  if (session.status !== 'in_progress') throw sessionClosed();
  const item = session.items.find((candidate) => candidate.id === itemId);
  if (!item) throw new NotFoundException({ code: 'PRACTICE_ITEM_NOT_FOUND' });
  if (!item.answer) throw new BadRequestException({ code: 'PRACTICE_ANSWER_REQUIRED' });
  return item;
}

function evaluationData(tenantId: string, sessionItemId: string, draft: EvaluationDraft) {
  return { tenantId, sessionItemId, ...evaluationUpdate(draft) };
}

function feedback(
  referenceAnswer: string,
  rubric: ReturnType<typeof EvaluatorRubricSchema.parse>,
  evaluation: Parameters<typeof mapEvaluation>[0],
) {
  return PracticeItemFeedbackSchema.parse({
    evaluation: mapEvaluation(evaluation),
    referenceAnswer,
    rubric,
  });
}

function evaluationUpdate(draft: EvaluationDraft) {
  return {
    score: draft.score,
    feedback: draft.feedback,
    missingPoints: draft.missingPoints,
    rubricScores: jsonValue(draft.rubricScores),
    followUpQuestion: draft.followUpQuestion,
  };
}

type EvaluationDraft = Awaited<ReturnType<PracticeModelEvaluator['evaluate']>>;

function sessionClosed() {
  return new ConflictException({ code: 'PRACTICE_SESSION_CLOSED' });
}

function answerChanged() {
  return new ConflictException({ code: 'PRACTICE_ANSWER_CHANGED' });
}
