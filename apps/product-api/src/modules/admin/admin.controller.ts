import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import {
  PublishCandidateQuestionInputSchema,
  UpdateCandidateQuestionInputSchema,
} from '@interview-agent/contracts';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { CandidateReviewService } from './candidate-review.service';
import { AdminService } from './admin.service';

@Roles('admin', 'question_reviewer')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly candidatesService: CandidateReviewService,
  ) {}

  @Get('dashboard')
  dashboard(@Req() request: ProductRequest) {
    return this.service.dashboard(request.context);
  }

  @Get('questions')
  questions(@Req() request: ProductRequest) {
    return this.service.questions(request.context);
  }

  @Get('candidates')
  candidates(@Req() request: ProductRequest) {
    return this.service.candidates(request.context);
  }

  @Get('candidates/:id')
  candidate(@Req() request: ProductRequest, @Param('id') candidateId: string) {
    return this.candidatesService.detail(request.context, candidateId);
  }

  @Patch('candidates/:id')
  updateCandidate(
    @Req() request: ProductRequest,
    @Param('id') candidateId: string,
    @Body() body: unknown,
  ) {
    return this.candidatesService.update(
      request.context,
      candidateId,
      UpdateCandidateQuestionInputSchema.parse(body),
    );
  }

  @Roles('admin')
  @Post('candidates/:id/publish')
  publishCandidate(
    @Req() request: ProductRequest,
    @Param('id') candidateId: string,
    @Body() body: unknown,
  ) {
    return this.candidatesService.publish(
      request.context,
      candidateId,
      PublishCandidateQuestionInputSchema.parse(body),
    );
  }

  @Roles('admin')
  @Get('model-profiles')
  modelProfiles(@Req() request: ProductRequest) {
    return this.service.modelProfiles(request.context);
  }

  @Roles('admin')
  @Get('agent-runs')
  agentRuns(@Req() request: ProductRequest) {
    return this.service.agentRuns(request.context);
  }

  @Roles('admin')
  @Get('audit-logs')
  auditLogs(@Req() request: ProductRequest) {
    return this.service.auditLogs(request.context);
  }
}
