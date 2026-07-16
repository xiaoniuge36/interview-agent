import { Controller, Get, Query, Req } from '@nestjs/common';
import { QuestionCatalogQuerySchema } from '@interview-agent/contracts';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { QuestionCatalogService } from './question-catalog.service';

@Roles('user', 'admin')
@Controller('question-catalog')
export class QuestionCatalogController {
  constructor(private readonly catalog: QuestionCatalogService) {}

  @Get()
  list(@Req() request: ProductRequest, @Query() query: Record<string, unknown>) {
    return this.catalog.list(request.context, QuestionCatalogQuerySchema.parse(query));
  }
}
