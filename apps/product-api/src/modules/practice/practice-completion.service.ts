import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PracticeReport, PracticeReportRuntimeResponse } from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { runSerializable } from '../../common/database/serializable-transaction';
import { createPracticeReportData, mapReport, type SessionRecord } from './practice-mappers';
import { PracticeEvaluationCommandService } from './practice-evaluation-command.service';
import { PracticeEvaluationInfrastructure } from './practice-evaluation-infrastructure';
import { MemoryProjectionService } from '../memory/memory-projection.service';
import { memoryEventsForPractice } from './practice-memory-events';
import { loadPracticeSession } from './practice-records';
import { PracticeReportPlannerService } from './practice-report-planner.service';

@Injectable()
export class PracticeCompletionService {
  @Inject(PracticeReportPlannerService)
  @Optional()
  private readonly reports?: PracticeReportPlannerService;

  constructor(
    private readonly infrastructure: PracticeEvaluationInfrastructure,
    private readonly evaluations: PracticeEvaluationCommandService,
    private readonly memory: MemoryProjectionService,
  ) {}

  async submit(context: ProductRequestContext, sessionId: string): Promise<PracticeReport> {
    const session = await loadPracticeSession(
      this.infrastructure.prisma,
      sessionId,
      context.tenantId,
    );
    this.assertAction(context, session.userId);
    let reportDraft: PracticeReportRuntimeResponse | undefined;
    if (!session.report) {
      assertOpenAndComplete(session, false);
      await this.evaluatePendingItems(context, session);
      const evaluated = await loadPracticeSession(
        this.infrastructure.prisma,
        sessionId,
        context.tenantId,
      );
      reportDraft = (await this.reports?.plan(context, evaluated)) ?? undefined;
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
      return this.createReport({ transaction, context, session: current, draft: reportDraft });
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

  private async createReport(input: {
    transaction: Prisma.TransactionClient;
    context: ProductRequestContext;
    session: SessionRecord;
    draft: PracticeReportRuntimeResponse | undefined;
  }) {
    const { transaction, context, session, draft } = input;
    const evaluations = session.items.map((item) => item.evaluation!);
    const report = await transaction.practiceReport.create({
      data: createPracticeReportData(session, evaluations, draft),
    });
    await this.memory.apply(
      transaction,
      memoryEventsForPractice({
        session,
        evaluations,
        traceId: context.traceId,
        createdAt: report.createdAt.toISOString(),
      }),
    );
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

function sessionClosed() {
  return new ConflictException({ code: 'PRACTICE_SESSION_CLOSED' });
}
