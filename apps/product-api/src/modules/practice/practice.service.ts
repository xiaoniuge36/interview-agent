import { Injectable } from '@nestjs/common';
import {
  type CreatePracticeSession,
  type MasteryProfile,
  type PracticeReport,
  type PracticeRecommendation,
  type PracticeItemFeedback,
  type PracticeItemSolution,
  type PracticeSession,
  type PracticeHistoryItem,
  type RecentPracticeSummary,
} from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import type { PracticeAnswerCommand } from './practice-command.service';
import { PracticeQueryService } from './practice-query.service';
import { PracticeRecommendationService } from './practice-recommendation.service';
import type {
  PracticeEvaluationCommand,
  PracticeEvaluationStream,
} from './practice-evaluation-command.service';
import { PracticeWriteService } from './practice-write.service';

@Injectable()
export class PracticeService {
  constructor(
    private readonly writes: PracticeWriteService,
    private readonly queries: PracticeQueryService,
    private readonly recommendations: PracticeRecommendationService,
  ) {}

  create(context: ProductRequestContext, input: CreatePracticeSession): Promise<PracticeSession> {
    return this.writes.create(context, input);
  }

  get(context: ProductRequestContext, sessionId: string): Promise<PracticeSession> {
    return this.queries.get(context, sessionId);
  }

  async submitAnswer(command: PracticeAnswerCommand): Promise<PracticeSession> {
    await this.writes.submitAnswer(command);
    return this.queries.get(command.context, command.sessionId);
  }

  submit(context: ProductRequestContext, sessionId: string): Promise<PracticeReport> {
    return this.writes.submit(context, sessionId);
  }

  getReport(context: ProductRequestContext, sessionId: string): Promise<PracticeReport> {
    return this.queries.getReport(context, sessionId);
  }

  mastery(context: ProductRequestContext): Promise<MasteryProfile[]> {
    return this.queries.mastery(context);
  }

  recent(context: ProductRequestContext): Promise<RecentPracticeSummary | null> {
    return this.queries.recent(context);
  }

  history(context: ProductRequestContext): Promise<PracticeHistoryItem[]> {
    return this.queries.history(context);
  }

  recommendationList(context: ProductRequestContext): Promise<PracticeRecommendation[]> {
    return this.recommendations.list(context);
  }

  evaluate(command: PracticeEvaluationCommand): Promise<PracticeItemFeedback> {
    return this.writes.evaluate(command);
  }

  evaluateStream(
    command: PracticeEvaluationCommand,
    stream: PracticeEvaluationStream,
  ): Promise<PracticeItemFeedback> {
    return this.writes.evaluateStream(command, stream);
  }

  async completeSelfStudy(
    context: ProductRequestContext,
    sessionId: string,
  ): Promise<PracticeSession> {
    await this.writes.completeSelfStudy(context, sessionId);
    return this.queries.get(context, sessionId);
  }

  solution(
    context: ProductRequestContext,
    sessionId: string,
    itemId: string,
  ): Promise<PracticeItemSolution> {
    return this.queries.solution(context, sessionId, itemId);
  }
}
