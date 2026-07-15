import { Injectable } from '@nestjs/common';
import {
  type CreatePracticeSession,
  type MasteryProfile,
  type PracticeReport,
  type PracticeSession,
} from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PracticeCommandService, type PracticeAnswerCommand } from './practice-command.service';
import { PracticeQueryService } from './practice-query.service';

@Injectable()
export class PracticeService {
  constructor(
    private readonly commands: PracticeCommandService,
    private readonly queries: PracticeQueryService,
  ) {}

  create(context: ProductRequestContext, input: CreatePracticeSession): Promise<PracticeSession> {
    return this.commands.create(context, input);
  }

  get(context: ProductRequestContext, sessionId: string): Promise<PracticeSession> {
    return this.queries.get(context, sessionId);
  }

  async submitAnswer(command: PracticeAnswerCommand): Promise<PracticeSession> {
    await this.commands.submitAnswer(command);
    return this.queries.get(command.context, command.sessionId);
  }

  submit(context: ProductRequestContext, sessionId: string): Promise<PracticeReport> {
    return this.commands.submit(context, sessionId);
  }

  getReport(context: ProductRequestContext, sessionId: string): Promise<PracticeReport> {
    return this.queries.getReport(context, sessionId);
  }

  mastery(context: ProductRequestContext): Promise<MasteryProfile[]> {
    return this.queries.mastery(context);
  }
}
