import { Injectable } from '@nestjs/common';
import type { ProductRequestContext } from '../../common/context/request-context';
import { InterviewCommandService, type InterviewCommandStream } from './interview-command.service';
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

  advance(request: AdvanceCommandRequest, signal?: AbortSignal) {
    return this.commands.advance(request, signal);
  }

  submitAnswer(request: AnswerCommandRequest, signal?: AbortSignal) {
    return this.commands.submitAnswer(request, signal);
  }

  advanceStream(request: AdvanceCommandRequest, stream: InterviewCommandStream) {
    return this.commands.advanceStream(request, stream);
  }

  submitAnswerStream(request: AnswerCommandRequest, stream: InterviewCommandStream) {
    return this.commands.submitAnswerStream(request, stream);
  }

  stream(input: { context: ProductRequestContext; sessionId: string; afterSequence: number }) {
    return this.queries.stream(input);
  }

  getReport(context: ProductRequestContext, sessionId: string) {
    return this.queries.report(context, sessionId);
  }
}
