import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { MarkdownImportRequestSchema } from '@interview-agent/contracts';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { ImportService } from './import.service';

@Roles('admin', 'question_reviewer')
@Controller('admin/imports')
export class ImportController {
  constructor(private readonly service: ImportService) {}

  @Post()
  create(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.service.create(request.context, MarkdownImportRequestSchema.parse(body));
  }

  @Get()
  list(@Req() request: ProductRequest) {
    return this.service.list(request.context);
  }
}
