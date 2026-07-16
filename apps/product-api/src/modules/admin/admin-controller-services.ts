import { CandidateReviewService } from '../content-review/candidate-review.service';
import { AccountGovernanceService } from './account-governance.service';
import { AdminQueryService } from './admin-query.service';
import { AdminService } from './admin.service';
import { PlatformDashboardService } from './platform-dashboard.service';

export const ADMIN_CONTROLLER_SERVICES = Symbol('ADMIN_CONTROLLER_SERVICES');

export type AdminControllerServices = {
  admin: AdminService;
  accounts: AccountGovernanceService;
  candidates: CandidateReviewService;
  platformDashboard: PlatformDashboardService;
  query: AdminQueryService;
};
