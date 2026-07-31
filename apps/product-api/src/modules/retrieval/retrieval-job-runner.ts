import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../common/config/environment';
import { BackgroundJobWorker } from '../jobs/job-worker';

type JobWorker = Pick<BackgroundJobWorker, 'runOnce'>;

@Injectable()
export class RetrievalJobRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetrievalJobRunner.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private polling = false;

  constructor(
    private readonly config: ConfigService<Environment, true>,
    @Inject(BackgroundJobWorker)
    private readonly worker: JobWorker,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get('BACKGROUND_JOB_WORKER_ENABLED', { infer: true })) return;
    await this.poll();
    const interval = this.config.get('BACKGROUND_JOB_POLL_INTERVAL_MS', { infer: true });
    this.timer = setInterval(() => void this.poll(), interval);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private async poll(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      await this.worker.runOnce();
    } catch (error) {
      this.logger.error('Background retrieval job poll failed.', error);
    } finally {
      this.polling = false;
    }
  }
}
