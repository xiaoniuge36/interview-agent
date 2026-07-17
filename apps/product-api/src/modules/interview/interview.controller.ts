import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  Sse,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Response } from 'express';
import {
  AdvanceInterviewInputSchema,
  StartInterviewInputSchema,
  SubmitInterviewAnswerInputSchema,
} from '@interview-agent/contracts';
import type { Observable } from 'rxjs';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { createAiOperationSse, streamError } from '../../common/streaming/ai-operation-sse';
import { InterviewService } from './interview.service';

const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9_.:-]{8,128}$/;
type InterviewStreamParams = { id: string };

@Roles('user')
@Controller('interviews')
export class InterviewController {
  constructor(private readonly service: InterviewService) {}

  @Get()
  list(@Req() request: ProductRequest) {
    return this.service.list(request.context);
  }

  @Get(':id')
  get(@Req() request: ProductRequest, @Param('id') sessionId: string) {
    return this.service.get(request.context, sessionId);
  }

  @Post('start')
  start(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.service.start({
      context: request.context,
      input: StartInterviewInputSchema.parse(body ?? {}),
      idempotencyKey: idempotencyKey(request),
    });
  }

  @Post(':id/advance')
  advance(@Req() request: ProductRequest, @Param('id') sessionId: string, @Body() body: unknown) {
    return this.service.advance({
      context: request.context,
      sessionId,
      input: AdvanceInterviewInputSchema.parse(body),
      idempotencyKey: idempotencyKey(request),
    });
  }

  @Post(':id/advance/stream')
  async advanceStream(
    @Req() request: ProductRequest,
    @Param() params: InterviewStreamParams,
    @Res() response: Response,
  ): Promise<void> {
    const input = AdvanceInterviewInputSchema.parse(request.body);
    const key = idempotencyKey(request);
    const connection = createAiOperationSse(response, request.context);
    const controller = streamAbortController(response);
    try {
      const execution = await this.service.advanceStream(
        {
          context: request.context,
          sessionId: params.id,
          input,
          idempotencyKey: key,
        },
        interviewStream(connection.sink, controller.signal),
      );
      connection.sink.result({ operation: 'interview_next', ...execution });
    } catch (error) {
      connection.sink.error(streamError(error, request.context));
    } finally {
      connection.close();
    }
  }

  @Post(':id/answer')
  answer(@Req() request: ProductRequest, @Param('id') sessionId: string, @Body() body: unknown) {
    return this.service.submitAnswer({
      context: request.context,
      sessionId,
      input: SubmitInterviewAnswerInputSchema.parse(body),
      idempotencyKey: idempotencyKey(request),
    });
  }

  @Post(':id/answer/stream')
  async answerStream(
    @Req() request: ProductRequest,
    @Param() params: InterviewStreamParams,
    @Res() response: Response,
  ): Promise<void> {
    const input = SubmitInterviewAnswerInputSchema.parse(request.body);
    const key = idempotencyKey(request);
    const connection = createAiOperationSse(response, request.context);
    const controller = streamAbortController(response);
    try {
      const execution = await this.service.submitAnswerStream(
        {
          context: request.context,
          sessionId: params.id,
          input,
          idempotencyKey: key,
        },
        interviewStream(connection.sink, controller.signal),
      );
      connection.sink.result({ operation: 'interview_next', ...execution });
    } catch (error) {
      connection.sink.error(streamError(error, request.context));
    } finally {
      connection.close();
    }
  }

  @Sse(':id/stream')
  async stream(
    @Req() request: ProductRequest,
    @Param('id') sessionId: string,
    @Query('after') after: string | undefined,
  ): Promise<Observable<MessageEvent>> {
    return this.service.stream({
      context: request.context,
      sessionId,
      afterSequence: eventCursor(after),
    });
  }

  @Get(':id/report')
  report(@Req() request: ProductRequest, @Param('id') sessionId: string) {
    return this.service.getReport(request.context, sessionId);
  }
}

function idempotencyKey(request: ProductRequest) {
  const key = request.header('idempotency-key')?.trim() ?? '';
  if (IDEMPOTENCY_KEY_PATTERN.test(key)) return key;
  throw new BadRequestException({
    code: 'INVALID_IDEMPOTENCY_KEY',
    message: 'Idempotency-Key 必须是 8 到 128 位安全字符。',
  });
}

function eventCursor(value: string | undefined) {
  const cursor = value === undefined ? 0 : Number(value);
  if (Number.isInteger(cursor) && cursor >= 0) return cursor;
  throw new BadRequestException({
    code: 'INVALID_EVENT_CURSOR',
    message: '事件游标必须是非负整数。',
  });
}

function streamAbortController(response: Response): AbortController {
  const controller = new AbortController();
  response.once('close', () => {
    if (!response.writableEnded) controller.abort();
  });
  return controller;
}

function interviewStream(
  sink: ReturnType<typeof createAiOperationSse>['sink'],
  signal: AbortSignal,
) {
  return {
    phase: sink.phase,
    delta: (content: string) => sink.delta('interviewer_content', content),
    signal,
  };
}
