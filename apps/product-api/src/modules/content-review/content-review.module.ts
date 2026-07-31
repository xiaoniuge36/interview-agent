import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { JobsModule } from '../jobs/jobs.module';
import { CandidatePublicationService } from './candidate-publication.service';
import { CandidateReviewInfrastructure } from './candidate-review-infrastructure';
import { CandidateReviewService } from './candidate-review.service';
import { KnowledgeAssetAdminController } from './knowledge-asset-admin.controller';
import { KnowledgeAssetLifecycleService } from './knowledge-asset-lifecycle.service';

@Module({
  imports: [CommonModule, JobsModule],
  controllers: [KnowledgeAssetAdminController],
  providers: [
    CandidateReviewInfrastructure,
    CandidatePublicationService,
    CandidateReviewService,
    KnowledgeAssetLifecycleService,
  ],
  exports: [CandidateReviewService, KnowledgeAssetLifecycleService],
})
export class ContentReviewModule {}
