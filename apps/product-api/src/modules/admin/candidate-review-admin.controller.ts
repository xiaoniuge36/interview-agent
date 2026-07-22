import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import {
  BatchCandidatePublishInputSchema,
  BatchCandidateReviewInputSchema,
  CandidateReviewListQuerySchema,
  PublishCandidateQuestionInputSchema,
  UpdateCandidateQuestionInputSchema,
} from '@interview-agent/contracts';
import type { Response } from 'express';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { CandidateReviewService } from '../content-review/candidate-review.service';
import { AdminQueryService } from './admin-query.service';
import { AdminService } from './admin.service';
import { renderCandidateExportCsv } from './admin-export-csv';

@Roles('admin', 'question_reviewer')
@Controller('admin')
export class CandidateReviewAdminController {
  constructor(
    private readonly candidates: CandidateReviewService,
    private readonly query: AdminQueryService,
    private readonly admin: AdminService,
  ) {}

  @Get('candidates/query')
  queryCandidates(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.query.queryCandidates(request.context, CandidateReviewListQuerySchema.parse(query));
  }

  @Get('candidates/export')
  async exportCandidates(
    @Req() request: ProductRequest,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rows = await this.query.exportCandidates(
      request.context,
      CandidateReviewListQuerySchema.parse(query),
    );
    response.attachment('candidates.csv');
    response.type('text/csv; charset=utf-8');
    return renderCandidateExportCsv(rows);
  }

  @Get('candidates')
  candidatesList(@Req() request: ProductRequest) {
    return this.admin.candidates(request.context);
  }

  @Patch('candidates/batch-review')
  batchReviewCandidates(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.candidates.batchReview(
      request.context,
      BatchCandidateReviewInputSchema.parse(body),
    );
  }

  @Roles('admin')
  @Post('candidates/batch-publish')
  batchPublishCandidates(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.candidates.batchPublish(
      request.context,
      BatchCandidatePublishInputSchema.parse(body),
    );
  }

  @Get('candidates/:id')
  candidate(@Req() request: ProductRequest, @Param('id') candidateId: string) {
    return this.candidates.detail(request.context, candidateId);
  }

  @Patch('candidates/:id')
  updateCandidate(
    @Req() request: ProductRequest,
    @Param('id') candidateId: string,
    @Body() body: unknown,
  ) {
    return this.candidates.update(
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
    return this.candidates.publish(
      request.context,
      candidateId,
      PublishCandidateQuestionInputSchema.parse(body),
    );
  }
}
