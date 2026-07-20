import { Controller, Get, Query, Req } from '@nestjs/common';
import { AiUsageSummaryQuerySchema } from '@interview-agent/contracts';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { AiUsageService } from './ai-usage.service';

@Roles('user')
@Controller('ai-usage')
export class AiUsageController {
  constructor(private readonly usage: AiUsageService) {}

  @Get('summary')
  summary(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.usage.summary(request.context, AiUsageSummaryQuerySchema.parse(query));
  }
}
