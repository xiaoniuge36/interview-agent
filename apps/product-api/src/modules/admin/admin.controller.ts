import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import {
  AgentRunListQuerySchema,
  AccountListQuerySchema,
  AuditLogListQuerySchema,
  BatchCandidateReviewInputSchema,
  CandidateReviewListQuerySchema,
  ModelProfileListQuerySchema,
  PlatformDashboardQuerySchema,
  PublishCandidateQuestionInputSchema,
  QuestionListQuerySchema,
  ResetLocalPasswordInputSchema,
  UpdateAccountRoleInputSchema,
  UpdateAccountStatusInputSchema,
  UpdateCandidateQuestionInputSchema,
} from '@interview-agent/contracts';
import type { Response } from 'express';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import {
  renderAccountExportCsv,
  renderAgentRunExportCsv,
  renderAuditLogExportCsv,
  renderCandidateExportCsv,
  renderModelProfileExportCsv,
  renderQuestionExportCsv,
} from './admin-export-csv';
import {
  ADMIN_CONTROLLER_SERVICES,
  type AdminControllerServices,
} from './admin-controller-services';

@Roles('admin', 'question_reviewer')
@Controller('admin')
export class AdminController {
  constructor(
    @Inject(ADMIN_CONTROLLER_SERVICES)
    private readonly services: AdminControllerServices,
  ) {}

  @Roles('platform_admin')
  @Get('platform/dashboard')
  platformDashboard(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.services.platformDashboard.dashboard(
      request.context,
      PlatformDashboardQuerySchema.parse(query),
    );
  }

  @Roles('platform_admin')
  @Get('accounts/query')
  queryAccounts(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.services.accounts.query(request.context, AccountListQuerySchema.parse(query));
  }

  @Roles('platform_admin')
  @Get('accounts/export')
  async exportAccounts(
    @Req() request: ProductRequest,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rows = await this.services.accounts.export(
      request.context,
      AccountListQuerySchema.parse(query),
    );
    return sendCsv(response, 'accounts.csv', renderAccountExportCsv(rows));
  }

  @Roles('platform_admin')
  @Get('accounts/:id')
  accountDetail(@Req() request: ProductRequest, @Param('id') accountId: string) {
    return this.services.accounts.detail(request.context, accountId);
  }

  @Roles('platform_admin')
  @Patch('accounts/:id/role')
  updateAccountRole(
    @Req() request: ProductRequest,
    @Param('id') accountId: string,
    @Body() body: unknown,
  ) {
    return this.services.accounts.updateRole(
      request.context,
      accountId,
      UpdateAccountRoleInputSchema.parse(body),
    );
  }

  @Roles('platform_admin')
  @Patch('accounts/:id/status')
  updateAccountStatus(
    @Req() request: ProductRequest,
    @Param('id') accountId: string,
    @Body() body: unknown,
  ) {
    return this.services.accounts.updateStatus(
      request.context,
      accountId,
      UpdateAccountStatusInputSchema.parse(body),
    );
  }

  @Roles('platform_admin')
  @Patch('accounts/:id/local-password')
  resetAccountLocalPassword(
    @Req() request: ProductRequest,
    @Param('id') accountId: string,
    @Body() body: unknown,
  ) {
    return this.services.accounts.resetLocalPassword(
      request.context,
      accountId,
      ResetLocalPasswordInputSchema.parse(body),
    );
  }

  @Get('dashboard')
  dashboard(@Req() request: ProductRequest) {
    return this.services.admin.dashboard(request.context);
  }

  @Get('questions/query')
  queryQuestions(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.services.query.queryQuestions(
      request.context,
      QuestionListQuerySchema.parse(query),
    );
  }

  @Get('questions/export')
  async exportQuestions(
    @Req() request: ProductRequest,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rows = await this.services.query.exportQuestions(
      request.context,
      QuestionListQuerySchema.parse(query),
    );
    return sendCsv(response, 'questions.csv', renderQuestionExportCsv(rows));
  }

  @Get('questions')
  questions(@Req() request: ProductRequest) {
    return this.services.admin.questions(request.context);
  }

  @Get('candidates/query')
  queryCandidates(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.services.query.queryCandidates(
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
    const rows = await this.services.query.exportCandidates(
      request.context,
      CandidateReviewListQuerySchema.parse(query),
    );
    return sendCsv(response, 'candidates.csv', renderCandidateExportCsv(rows));
  }

  @Get('candidates')
  candidates(@Req() request: ProductRequest) {
    return this.services.admin.candidates(request.context);
  }

  @Patch('candidates/batch-review')
  batchReviewCandidates(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.services.candidates.batchReview(
      request.context,
      BatchCandidateReviewInputSchema.parse(body),
    );
  }

  @Get('candidates/:id')
  candidate(@Req() request: ProductRequest, @Param('id') candidateId: string) {
    return this.services.candidates.detail(request.context, candidateId);
  }

  @Patch('candidates/:id')
  updateCandidate(
    @Req() request: ProductRequest,
    @Param('id') candidateId: string,
    @Body() body: unknown,
  ) {
    return this.services.candidates.update(
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
    return this.services.candidates.publish(
      request.context,
      candidateId,
      PublishCandidateQuestionInputSchema.parse(body),
    );
  }

  @Roles('admin')
  @Get('model-profiles/query')
  queryModelProfiles(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.services.query.queryModelProfiles(
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
    const rows = await this.services.query.exportModelProfiles(
      request.context,
      ModelProfileListQuerySchema.parse(query),
    );
    return sendCsv(response, 'model-profiles.csv', renderModelProfileExportCsv(rows));
  }

  @Roles('admin')
  @Get('model-profiles')
  modelProfiles(@Req() request: ProductRequest) {
    return this.services.admin.modelProfiles(request.context);
  }

  @Roles('admin')
  @Get('agent-runs/query')
  queryAgentRuns(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.services.query.queryAgentRuns(
      request.context,
      AgentRunListQuerySchema.parse(query),
    );
  }

  @Roles('admin')
  @Get('agent-runs/export')
  async exportAgentRuns(
    @Req() request: ProductRequest,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rows = await this.services.query.exportAgentRuns(
      request.context,
      AgentRunListQuerySchema.parse(query),
    );
    return sendCsv(response, 'agent-runs.csv', renderAgentRunExportCsv(rows));
  }

  @Roles('admin')
  @Get('agent-runs')
  agentRuns(@Req() request: ProductRequest) {
    return this.services.admin.agentRuns(request.context);
  }

  @Roles('admin')
  @Get('audit-logs/query')
  queryAuditLogs(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.services.query.queryAuditLogs(
      request.context,
      AuditLogListQuerySchema.parse(query),
    );
  }

  @Roles('admin')
  @Get('audit-logs/export')
  async exportAuditLogs(
    @Req() request: ProductRequest,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rows = await this.services.query.exportAuditLogs(
      request.context,
      AuditLogListQuerySchema.parse(query),
    );
    return sendCsv(response, 'audit-logs.csv', renderAuditLogExportCsv(rows));
  }

  @Roles('admin')
  @Get('audit-logs')
  auditLogs(@Req() request: ProductRequest) {
    return this.services.admin.auditLogs(request.context);
  }
}

function sendCsv(response: Response, filename: string, body: string): string {
  response.attachment(filename);
  response.type('text/csv; charset=utf-8');
  return body;
}
