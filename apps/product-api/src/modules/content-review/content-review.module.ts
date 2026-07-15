import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { CandidateReviewService } from './candidate-review.service';

@Module({
  imports: [CommonModule],
  providers: [CandidateReviewService],
  exports: [CandidateReviewService],
})
export class ContentReviewModule {}
