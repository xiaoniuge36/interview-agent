import { Controller, Get, Query, Req } from '@nestjs/common';
import { RetrievalQuerySchema } from '@interview-agent/contracts';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { AiThrottle } from '../../common/security/ai-throttle';
import { RetrievalService } from './retrieval.service';

@Roles('user', 'admin')
@Controller('retrieval')
export class RetrievalController {
  constructor(private readonly retrieval: RetrievalService) {}

  @AiThrottle()
  @Get()
  search(@Req() request: ProductRequest, @Query() query: Record<string, unknown>) {
    return this.retrieval.search(request.context, RetrievalQuerySchema.parse(query));
  }
}
