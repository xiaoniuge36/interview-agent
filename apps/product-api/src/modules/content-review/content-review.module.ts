import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { JobsModule } from '../jobs/jobs.module';
import { CandidatePublicationService } from './candidate-publication.service';
import { CandidateReviewInfrastructure } from './candidate-review-infrastructure';
import { CandidateReviewService } from './candidate-review.service';

@Module({
  imports: [CommonModule, JobsModule],
  providers: [CandidateReviewInfrastructure, CandidatePublicationService, CandidateReviewService],
  exports: [CandidateReviewService],
})
export class ContentReviewModule {}
