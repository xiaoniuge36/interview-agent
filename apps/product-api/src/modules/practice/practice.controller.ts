import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  CreatePracticeSessionSchema,
  MistakeBookQuerySchema,
  SubmitPracticeAnswerSchema,
} from '@interview-agent/contracts';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { AiThrottle } from '../../common/security/ai-throttle';
import { createAiOperationSse, streamError } from '../../common/streaming/ai-operation-sse';
import { PracticeService } from './practice.service';
import { PracticeStarMaterialService } from './practice-star-material.service';

type PracticeAnswerParams = { id: string; itemId: string };

@Roles('user', 'admin')
@Controller()
export class PracticeController {
  constructor(
    private readonly service: PracticeService,
    private readonly starMaterialService: PracticeStarMaterialService,
  ) {}

  @Post('practices')
  create(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.service.create(request.context, CreatePracticeSessionSchema.parse(body));
  }

  @Get('practices/recent')
  recent(@Req() request: ProductRequest) {
    return this.service.recent(request.context);
  }

  @Get('practices/history')
  history(@Req() request: ProductRequest) {
    return this.service.history(request.context);
  }

  @Get('practice-mistakes')
  mistakes(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.service.mistakes(request.context, MistakeBookQuerySchema.parse(query));
  }

  @Post('practice-mistakes/:id/review')
  reviewMistake(@Req() request: ProductRequest, @Param('id') mistakeId: string) {
    return this.service.reviewMistake(request.context, mistakeId);
  }

  @Get('practice-star-materials')
  starMaterials(@Req() request: ProductRequest) {
    return this.starMaterialService.list(request.context);
  }

  @Get('practice-recommendations')
  recommendations(@Req() request: ProductRequest) {
    return this.service.recommendationList(request.context);
  }

  @Get('practices/:id')
  get(@Req() request: ProductRequest, @Param('id') sessionId: string) {
    return this.service.get(request.context, sessionId);
  }

  @Post('practices/:id/answers/:itemId')
  submitAnswer(
    @Req() request: ProductRequest,
    @Param() params: PracticeAnswerParams,
    @Body() body: unknown,
  ) {
    return this.service.submitAnswer({
      context: request.context,
      sessionId: params.id,
      itemId: params.itemId,
      input: SubmitPracticeAnswerSchema.parse(body),
    });
  }

  @AiThrottle()
  @Post('practices/:id/items/:itemId/evaluate')
  evaluate(@Req() request: ProductRequest, @Param() params: PracticeAnswerParams) {
    return this.service.evaluate({
      context: request.context,
      sessionId: params.id,
      itemId: params.itemId,
    });
  }

  @AiThrottle()
  @Post('practices/:id/items/:itemId/evaluate/stream')
  async evaluateStream(
    @Req() request: ProductRequest,
    @Param() params: PracticeAnswerParams,
    @Res() response: Response,
  ): Promise<void> {
    const controller = new AbortController();
    const connection = createAiOperationSse(response, request.context, controller.signal);
    response.once('close', () => {
      if (!response.writableEnded) controller.abort();
    });
    try {
      const result = await this.service.evaluateStream(
        { context: request.context, sessionId: params.id, itemId: params.itemId },
        {
          phase: connection.sink.phase,
          delta: (content) => connection.sink.delta('evaluation_feedback', content),
          signal: controller.signal,
        },
      );
      await connection.sink.result({ operation: 'practice_evaluation', result });
    } catch (error) {
      await connection.sink.error(streamError(error, request.context));
    } finally {
      connection.close();
    }
  }

  @Get('practices/:id/items/:itemId/solution')
  solution(@Req() request: ProductRequest, @Param() params: PracticeAnswerParams) {
    return this.service.solution(request.context, params.id, params.itemId);
  }

  @Post('practices/:id/complete-self-study')
  completeSelfStudy(@Req() request: ProductRequest, @Param('id') sessionId: string) {
    return this.service.completeSelfStudy(request.context, sessionId);
  }

  @AiThrottle()
  @Post('practices/:id/submit')
  submit(@Req() request: ProductRequest, @Param('id') sessionId: string) {
    return this.service.submit(request.context, sessionId);
  }

  @Get('practices/:id/report')
  report(@Req() request: ProductRequest, @Param('id') sessionId: string) {
    return this.service.getReport(request.context, sessionId);
  }

  @Get('mastery')
  mastery(@Req() request: ProductRequest) {
    return this.service.mastery(request.context);
  }
}
