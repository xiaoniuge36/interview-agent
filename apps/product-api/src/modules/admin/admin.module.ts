import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ContentReviewModule } from '../content-review/content-review.module';

@Module({
  imports: [CommonModule, ContentReviewModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
