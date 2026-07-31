const RETRYABLE_CODES = new Set([
  'MODEL_PROVIDER_RATE_LIMITED',
  'MODEL_PROVIDER_UNAVAILABLE',
  'EMBEDDING_TIMEOUT',
]);

export type BackgroundJobRecord = {
  id: string;
  attempts: number;
  maxAttempts: number;
  tenantId?: string;
  type?: 'embedding';
  payload?: unknown;
};
export type BackgroundJobProcessor = { process(job: BackgroundJobRecord): Promise<void> };
type JobRepository = {
  claim(owner: string): Promise<BackgroundJobRecord | null>;
  claimExpired(owner: string): Promise<BackgroundJobRecord | null>;
  complete(job: BackgroundJobRecord): Promise<void>;
  retry(job: BackgroundJobRecord, code: string): Promise<void>;
  deadLetter(job: BackgroundJobRecord, code: string): Promise<void>;
};

export class BackgroundJobWorker {
  constructor(
    private readonly repository: JobRepository,
    private readonly owner: string,
    private readonly processor?: BackgroundJobProcessor,
  ) {}

  claim() {
    return this.repository.claim(this.owner);
  }

  async runOnce(): Promise<boolean> {
    if (!this.processor) return false;
    const job = (await this.claim()) ?? (await this.repository.claimExpired(this.owner));
    if (!job) return false;
    try {
      await this.processor.process(job);
      await this.repository.complete(job);
    } catch (error) {
      await this.fail(job, jobErrorCode(error));
    }
    return true;
  }

  async fail(job: BackgroundJobRecord, code: string): Promise<void> {
    if (RETRYABLE_CODES.has(code) && job.attempts < job.maxAttempts) {
      await this.repository.retry(job, code);
      return;
    }
    await this.repository.deadLetter(job, code);
  }
}

function jobErrorCode(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }
  return 'MODEL_PROVIDER_UNAVAILABLE';
}
