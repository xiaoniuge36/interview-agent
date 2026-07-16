import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AdminController } from './admin.controller';
import { AccountGovernanceService } from './account-governance.service';
import { AdminQueryService } from './admin-query.service';
import { AdminService } from './admin.service';
import { ContentReviewModule } from '../content-review/content-review.module';
import { CandidateReviewService } from '../content-review/candidate-review.service';
import { PlatformDashboardService } from './platform-dashboard.service';
import { ADMIN_CONTROLLER_SERVICES } from './admin-controller-services';

@Module({
  imports: [CommonModule, ContentReviewModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminQueryService,
    PlatformDashboardService,
    AccountGovernanceService,
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
