import { Injectable } from '@nestjs/common';
import type { ProductRequestContext } from '../../common/context/request-context';
import { InterviewCommandService } from './interview-command.service';
import { InterviewQueryService } from './interview-query.service';
import type {
  AdvanceCommandRequest,
  AnswerCommandRequest,
  StartCommandRequest,
} from './interview.types';

@Injectable()
export class InterviewService {
  constructor(
    private readonly commands: InterviewCommandService,
    private readonly queries: InterviewQueryService,
  ) {}

  list(context: ProductRequestContext) {
    return this.queries.list(context);
  }

  get(context: ProductRequestContext, sessionId: string) {
    return this.queries.get(context, sessionId);
  }

  start(request: StartCommandRequest) {
    return this.commands.start(request);
  }

  advance(request: AdvanceCommandRequest) {
    return this.commands.advance(request);
  }

  submitAnswer(request: AnswerCommandRequest) {
    return this.commands.submitAnswer(request);
  }

  stream(input: { context: ProductRequestContext; sessionId: string; afterSequence: number }) {
    return this.queries.stream(input);
  }

  getReport(context: ProductRequestContext, sessionId: string) {
    return this.queries.report(context, sessionId);
  }
}
