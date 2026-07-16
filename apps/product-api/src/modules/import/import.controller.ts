import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ImportTaskListQuerySchema, MarkdownImportRequestSchema } from '@interview-agent/contracts';
import type { Response } from 'express';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { renderImportTaskExportCsv } from '../admin/admin-export-csv';
import { ImportService } from './import.service';

@Roles('admin', 'question_reviewer')
@Controller('admin/imports')
export class ImportController {
  constructor(private readonly service: ImportService) {}

  @Post()
  create(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.service.create(request.context, MarkdownImportRequestSchema.parse(body));
  }

  @Get('query')
  query(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.service.query(request.context, ImportTaskListQuerySchema.parse(query));
  }

  @Get('export')
  async export(
    @Req() request: ProductRequest,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rows = await this.service.listForExport(
      request.context,
      ImportTaskListQuerySchema.parse(query),
    );
    response.attachment('imports.csv');
    response.type('text/csv; charset=utf-8');
    return renderImportTaskExportCsv(rows);
  }

  @Get(':taskId/review-context')
  reviewContext(@Req() request: ProductRequest, @Param('taskId') taskId: string) {
    return this.service.reviewContext(request.context, taskId);
  }

  @Get()
  list(@Req() request: ProductRequest) {
    return this.service.list(request.context);
  }
}
