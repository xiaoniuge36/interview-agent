import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { BackgroundJobDispatcher } from './job-dispatcher';
import { BackgroundJobRepository } from './job-repository';

@Module({
  imports: [CommonModule],
  providers: [BackgroundJobRepository, BackgroundJobDispatcher],
  exports: [BackgroundJobRepository, BackgroundJobDispatcher],
})
export class JobsModule {}
