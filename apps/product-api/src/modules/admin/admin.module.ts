import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AiUsageModule } from '../ai-usage/ai-usage.module';
import { ModelCredentialModule } from '../model-credential/model-credential.module';
import { AdminController } from './admin.controller';
import { AccountGovernanceService } from './account-governance.service';
import { AdminQueryService } from './admin-query.service';
import { AdminService } from './admin.service';
import { ContentReviewModule } from '../content-review/content-review.module';
import { CandidateReviewService } from '../content-review/candidate-review.service';
import { PlatformDashboardService } from './platform-dashboard.service';
import { PlatformAiAnalyticsController } from './platform-ai-analytics.controller';
import { ADMIN_CONTROLLER_SERVICES } from './admin-controller-services';
import { AdminPageAgentController } from './admin-page-agent.controller';
import { AdminPageAgentConversationService } from './admin-page-agent-conversation.service';
import { AdminPageAgentService } from './admin-page-agent.service';

@Module({
  imports: [CommonModule, AiUsageModule, ContentReviewModule, ModelCredentialModule],
  controllers: [AdminController, PlatformAiAnalyticsController, AdminPageAgentController],
  providers: [
    AdminService,
    AdminQueryService,
    PlatformDashboardService,
    AccountGovernanceService,
    AdminPageAgentService,
    AdminPageAgentConversationService,
    {
      provide: ADMIN_CONTROLLER_SERVICES,
      inject: [
        AdminService,
        AdminQueryService,
        CandidateReviewService,
        PlatformDashboardService,
        AccountGovernanceService,
      ],
      useFactory: (
        ...services: [
          AdminService,
          AdminQueryService,
          CandidateReviewService,
          PlatformDashboardService,
          AccountGovernanceService,
        ]
      ) => {
        const [admin, query, candidates, platformDashboard, accounts] = services;
        return { admin, query, candidates, platformDashboard, accounts };
      },
    },
  ],
})
export class AdminModule {}
