import { Injectable } from '@nestjs/common';
import type {
  CreatePracticeSession,
  PracticeItemFeedback,
  PracticeReport,
  PracticeSession,
} from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PracticeCommandService, type PracticeAnswerCommand } from './practice-command.service';
import { PracticeCompletionService } from './practice-completion.service';
import {
  PracticeEvaluationCommandService,
  type PracticeEvaluationCommand,
} from './practice-evaluation-command.service';

@Injectable()
export class PracticeWriteService {
  constructor(
    private readonly commands: PracticeCommandService,
    private readonly evaluations: PracticeEvaluationCommandService,
    private readonly completion: PracticeCompletionService,
  ) {}

  create(context: ProductRequestContext, input: CreatePracticeSession): Promise<PracticeSession> {
    return this.commands.create(context, input);
  }

  submitAnswer(command: PracticeAnswerCommand): Promise<void> {
    return this.commands.submitAnswer(command);
  }

  evaluate(command: PracticeEvaluationCommand): Promise<PracticeItemFeedback> {
    return this.evaluations.evaluate(command);
  }

  submit(context: ProductRequestContext, sessionId: string): Promise<PracticeReport> {
    return this.completion.submit(context, sessionId);
  }

  completeSelfStudy(context: ProductRequestContext, sessionId: string): Promise<void> {
    return this.completion.completeSelfStudy(context, sessionId);
  }
}
