import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PracticeReport } from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { runSerializable } from '../../common/database/serializable-transaction';
import {
  createPracticeReportData,
  mapReport,
  type EvaluationRecord,
  type SessionRecord,
} from './practice-mappers';
import { PracticeEvaluationCommandService } from './practice-evaluation-command.service';
import { PracticeEvaluationInfrastructure } from './practice-evaluation-infrastructure';
import { loadPracticeSession } from './practice-records';

type MasteryUpdateInput = {
  transaction: Prisma.TransactionClient;
  context: ProductRequestContext;
  session: SessionRecord;
  evaluations: EvaluationRecord[];
};

@Injectable()
export class PracticeCompletionService {
  constructor(
    private readonly infrastructure: PracticeEvaluationInfrastructure,
    private readonly evaluations: PracticeEvaluationCommandService,
  ) {}

  async submit(context: ProductRequestContext, sessionId: string): Promise<PracticeReport> {
    const session = await loadPracticeSession(
      this.infrastructure.prisma,
      sessionId,
      context.tenantId,
    );
    this.assertAction(context, session.userId);
    if (!session.report) {
      assertOpenAndComplete(session, false);
      await this.evaluatePendingItems(context, session);
    }
    return runSerializable(this.infrastructure.prisma, async (transaction) => {
      const current = await loadPracticeSession(transaction, sessionId, context.tenantId);
      this.assertAction(context, current.userId);
      if (current.report) return mapReport(current.report, current.items);
      assertOpenAndComplete(current, true);
      const claimed = await transaction.practiceSession.updateMany({
        where: { id: sessionId, tenantId: context.tenantId, status: 'in_progress' },
        data: { status: 'submitted', submittedAt: new Date() },
      });
      if (claimed.count === 0) return this.completedReport(transaction, context, sessionId);
      return this.createReport(transaction, context, current);
    });
  }

  private async evaluatePendingItems(
    context: ProductRequestContext,
    session: SessionRecord,
  ): Promise<void> {
    const pendingItems = session.items.filter((item) => item.answer && !item.evaluation);
    for (const item of pendingItems) {
      await this.evaluations.evaluate({ context, sessionId: session.id, itemId: item.id });
    }
  }

  async completeSelfStudy(context: ProductRequestContext, sessionId: string): Promise<void> {
    const session = await loadPracticeSession(
      this.infrastructure.prisma,
      sessionId,
      context.tenantId,
    );
    this.assertAction(context, session.userId);
    await runSerializable(this.infrastructure.prisma, async (transaction) => {
      const current = await loadPracticeSession(transaction, sessionId, context.tenantId);
      this.assertAction(context, current.userId);
      assertOpenAndComplete(current, false);
      await transaction.practiceSession.update({
        where: { tenantId_id: { tenantId: context.tenantId, id: sessionId } },
        data: { status: 'submitted', submittedAt: new Date() },
      });
      await this.infrastructure.audit.record(
        context,
        {
          action: 'practice:complete_self_study',
          resourceType: 'PracticeSession',
          resourceId: sessionId,
        },
        transaction,
      );
    });
  }

  private async createReport(
    transaction: Prisma.TransactionClient,
    context: ProductRequestContext,
    session: SessionRecord,
  ) {
    const evaluations = session.items.map((item) => item.evaluation!);
    await this.updateMastery({ transaction, context, session, evaluations });
    const report = await transaction.practiceReport.create({
      data: createPracticeReportData(session, evaluations),
    });
    await transaction.practiceSession.update({
      where: { tenantId_id: { tenantId: session.tenantId, id: session.id } },
      data: { status: 'report_ready', reportedAt: new Date() },
    });
    await this.infrastructure.audit.record(
      context,
      {
        action: 'practice:submit',
        resourceType: 'PracticeSession',
        resourceId: session.id,
        metadata: { evaluatorMode: 'user_model', overallScore: report.overallScore },
      },
      transaction,
    );
    return mapReport(report, session.items);
  }

  private async completedReport(
    transaction: Prisma.TransactionClient,
    context: ProductRequestContext,
    sessionId: string,
  ) {
    const latest = await loadPracticeSession(transaction, sessionId, context.tenantId);
    if (latest.report) return mapReport(latest.report, latest.items);
    throw sessionClosed();
  }

  private async updateMastery(input: MasteryUpdateInput) {
    const scoresByTag = scoresForTags(input.session, input.evaluations);
    for (const [tag, scores] of scoresByTag) {
      const identity = { tenantId: input.context.tenantId, userId: input.context.actor.id, tag };
      const current = await input.transaction.masteryProfile.findUnique({
        where: { tenantId_userId_tag: identity },
      });
      const evidenceCount = (current?.evidenceCount ?? 0) + scores.length;
      const priorTotal = (current?.score ?? 0) * (current?.evidenceCount ?? 0);
      const score = (priorTotal + scores.reduce((sum, value) => sum + value, 0)) / evidenceCount;
      await input.transaction.masteryProfile.upsert({
        where: { tenantId_userId_tag: identity },
        create: { ...identity, score, evidenceCount, lastEvidenceSessionId: input.session.id },
        update: { score, evidenceCount, lastEvidenceSessionId: input.session.id },
      });
    }
  }

  private assertAction(context: ProductRequestContext, ownerId: string) {
    this.infrastructure.policy.assert(context.actor, 'practice:submit', {
      tenantId: context.tenantId,
      ownerId,
    });
  }
}

function assertOpenAndComplete(session: SessionRecord, requireEvaluation: boolean) {
  if (session.status !== 'in_progress') throw sessionClosed();
  if (session.items.some((item) => !item.answer)) {
    throw new BadRequestException({ code: 'PRACTICE_ANSWERS_INCOMPLETE' });
  }
  if (requireEvaluation && session.items.some((item) => !item.evaluation)) {
    throw new BadRequestException({ code: 'PRACTICE_EVALUATIONS_INCOMPLETE' });
  }
}

function scoresForTags(session: SessionRecord, evaluations: EvaluationRecord[]) {
  const result = new Map<string, number[]>();
  session.items.forEach((item, index) => {
    item.question.tags.forEach((tag) => {
      const scores = result.get(tag) ?? [];
      result.set(tag, [...scores, evaluations[index]!.score]);
    });
  });
  return result;
}

function sessionClosed() {
  return new ConflictException({ code: 'PRACTICE_SESSION_CLOSED' });
}
