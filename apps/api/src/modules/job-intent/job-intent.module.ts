import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { JobIntentController } from './job-intent.controller';
import { JobIntentService } from './job-intent.service';

@Module({
  imports: [CommonModule],
  controllers: [JobIntentController],
  providers: [JobIntentService],
  exports: [JobIntentService],
})
export class JobIntentModule {}
