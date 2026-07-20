import { Controller, Get, Query, Req } from '@nestjs/common';
import { PlatformAiAnalyticsQuerySchema } from '@interview-agent/contracts';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { PlatformAiAnalyticsService } from '../ai-usage/platform-ai-analytics.service';

@Roles('platform_admin')
@Controller('admin/platform')
export class PlatformAiAnalyticsController {
  constructor(private readonly analytics: PlatformAiAnalyticsService) {}

  @Get('ai-analytics')
  get(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.analytics.analytics(request.context, PlatformAiAnalyticsQuerySchema.parse(query));
  }
}
