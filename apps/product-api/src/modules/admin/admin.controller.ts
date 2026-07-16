import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import {
  AgentRunListQuerySchema,
  AuditLogListQuerySchema,
  BatchCandidateReviewInputSchema,
  CandidateReviewListQuerySchema,
  ModelProfileListQuerySchema,
  PublishCandidateQuestionInputSchema,
  QuestionListQuerySchema,
  UpdateCandidateQuestionInputSchema,
} from '@interview-agent/contracts';
import type { Response } from 'express';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { CandidateReviewService } from '../content-review/candidate-review.service';
import {
  renderAgentRunExportCsv,
  renderAuditLogExportCsv,
  renderCandidateExportCsv,
  renderModelProfileExportCsv,
  renderQuestionExportCsv,
} from './admin-export-csv';
import { AdminQueryService } from './admin-query.service';
import { AdminService } from './admin.service';

@Roles('admin', 'question_reviewer')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly candidatesService: CandidateReviewService,
    private readonly queryService: AdminQueryService,
  ) {}

  @Get('dashboard')
  dashboard(@Req() request: ProductRequest) {
    return this.service.dashboard(request.context);
  }

  @Get('questions/query')
  queryQuestions(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.queryService.queryQuestions(request.context, QuestionListQuerySchema.parse(query));
  }

  @Get('questions/export')
  async exportQuestions(
    @Req() request: ProductRequest,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rows = await this.queryService.exportQuestions(
      request.context,
      QuestionListQuerySchema.parse(query),
    );
    return sendCsv(response, 'questions.csv', renderQuestionExportCsv(rows));
  }

  @Get('questions')
  questions(@Req() request: ProductRequest) {
    return this.service.questions(request.context);
  }

  @Get('candidates/query')
  queryCandidates(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.queryService.queryCandidates(
      request.context,
      CandidateReviewListQuerySchema.parse(query),
    );
  }

  @Get('candidates/export')
  async exportCandidates(
    @Req() request: ProductRequest,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rows = await this.queryService.exportCandidates(
      request.context,
      CandidateReviewListQuerySchema.parse(query),
    );
    return sendCsv(response, 'candidates.csv', renderCandidateExportCsv(rows));
  }

  @Get('candidates')
  candidates(@Req() request: ProductRequest) {
    return this.service.candidates(request.context);
  }

  @Patch('candidates/batch-review')
  batchReviewCandidates(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.candidatesService.batchReview(
      request.context,
      BatchCandidateReviewInputSchema.parse(body),
    );
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
  @Get('model-profiles/query')
  queryModelProfiles(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.queryService.queryModelProfiles(
      request.context,
      ModelProfileListQuerySchema.parse(query),
    );
  }

  @Roles('admin')
  @Get('model-profiles/export')
  async exportModelProfiles(
    @Req() request: ProductRequest,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rows = await this.queryService.exportModelProfiles(
      request.context,
      ModelProfileListQuerySchema.parse(query),
    );
    return sendCsv(response, 'model-profiles.csv', renderModelProfileExportCsv(rows));
  }

  @Roles('admin')
  @Get('model-profiles')
  modelProfiles(@Req() request: ProductRequest) {
    return this.service.modelProfiles(request.context);
  }

  @Roles('admin')
  @Get('agent-runs/query')
  queryAgentRuns(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.queryService.queryAgentRuns(request.context, AgentRunListQuerySchema.parse(query));
  }

  @Roles('admin')
  @Get('agent-runs/export')
  async exportAgentRuns(
    @Req() request: ProductRequest,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rows = await this.queryService.exportAgentRuns(
      request.context,
      AgentRunListQuerySchema.parse(query),
    );
    return sendCsv(response, 'agent-runs.csv', renderAgentRunExportCsv(rows));
  }

  @Roles('admin')
  @Get('agent-runs')
  agentRuns(@Req() request: ProductRequest) {
    return this.service.agentRuns(request.context);
  }

  @Roles('admin')
  @Get('audit-logs/query')
  queryAuditLogs(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.queryService.queryAuditLogs(request.context, AuditLogListQuerySchema.parse(query));
  }

  @Roles('admin')
  @Get('audit-logs/export')
  async exportAuditLogs(
    @Req() request: ProductRequest,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rows = await this.queryService.exportAuditLogs(
      request.context,
      AuditLogListQuerySchema.parse(query),
    );
    return sendCsv(response, 'audit-logs.csv', renderAuditLogExportCsv(rows));
  }

  @Roles('admin')
  @Get('audit-logs')
  auditLogs(@Req() request: ProductRequest) {
    return this.service.auditLogs(request.context);
  }
}

function sendCsv(response: Response, filename: string, body: string): string {
  response.attachment(filename);
  response.type('text/csv; charset=utf-8');
  return body;
}
