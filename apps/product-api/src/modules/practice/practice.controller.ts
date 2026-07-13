import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  CreatePracticeSessionSchema,
  SubmitPracticeAnswerSchema,
} from '@interview-agent/contracts';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { PracticeService } from './practice.service';

type PracticeAnswerParams = { id: string; itemId: string };

@Roles('user', 'admin')
@Controller()
export class PracticeController {
  constructor(private readonly service: PracticeService) {}

  @Post('practices')
  create(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.service.create(request.context, CreatePracticeSessionSchema.parse(body));
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
