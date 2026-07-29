import { Module } from '@nestjs/common';
import { AiUsageModule } from '../ai-usage/ai-usage.module';
import { BackgroundJobRepository } from '../jobs/job-repository';
import { BackgroundJobWorker } from '../jobs/job-worker';
import { JobsModule } from '../jobs/jobs.module';
import { ModelCredentialModule } from '../model-credential/model-credential.module';
import { EmbeddingClient } from './embedding-client';
import { RetrievalController } from './retrieval.controller';
import { RetrievalJobProcessor } from './retrieval-job.processor';
import { RetrievalJobRunner } from './retrieval-job-runner';
import { RetrievalRepository } from './retrieval-repository';
import { RetrievalService } from './retrieval.service';

@Module({
  imports: [AiUsageModule, JobsModule, ModelCredentialModule],
  controllers: [RetrievalController],
  providers: [
    EmbeddingClient,
    RetrievalRepository,
    RetrievalService,
    RetrievalJobProcessor,
    {
      provide: BackgroundJobWorker,
      useFactory: (repository: BackgroundJobRepository, processor: RetrievalJobProcessor) =>
        new BackgroundJobWorker(repository, `retrieval-${process.pid}`, processor),
      inject: [BackgroundJobRepository, RetrievalJobProcessor],
    },
    RetrievalJobRunner,
  ],
  exports: [RetrievalService],
})
export class RetrievalModule {}
