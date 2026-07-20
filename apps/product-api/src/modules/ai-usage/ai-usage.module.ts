import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AiInvocationService } from './ai-invocation.service';
import { AiUsageController } from './ai-usage.controller';
import { AiUsageService } from './ai-usage.service';
import { PlatformAiAnalyticsService } from './platform-ai-analytics.service';

@Module({
  imports: [CommonModule],
  controllers: [AiUsageController],
  providers: [AiInvocationService, AiUsageService, PlatformAiAnalyticsService],
  exports: [AiInvocationService, AiUsageService, PlatformAiAnalyticsService],
})
export class AiUsageModule {}
