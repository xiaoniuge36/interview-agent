import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { LearningProgressController } from './learning-progress.controller';
import { LearningProgressService } from './learning-progress.service';

@Module({
  imports: [CommonModule],
  controllers: [LearningProgressController],
  providers: [LearningProgressService],
})
export class LearningProgressModule {}
