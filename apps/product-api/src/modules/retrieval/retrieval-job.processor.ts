import { Injectable } from '@nestjs/common';
import type { EmbeddingJobPayload } from '../jobs/job-dispatcher';
import type { BackgroundJobProcessor, BackgroundJobRecord } from '../jobs/job-worker';
import { ModelProviderError } from '../model-credential/model-provider.client';
import { EmbeddingClient } from './embedding-client';
import { RetrievalRepository } from './retrieval-repository';

@Injectable()
export class RetrievalJobProcessor implements BackgroundJobProcessor {
  constructor(
    private readonly embeddings: EmbeddingClient,
    private readonly repository: RetrievalRepository,
  ) {}

  async process(job: BackgroundJobRecord): Promise<void> {
    const payload = embeddingPayload(job);
    const vector = await this.embeddings.embed({
      tenantId: job.tenantId!,
      userId: payload.userId,
      traceId: payload.traceId,
      text: payload.content,
    });
    if (!vector) throw new ModelProviderError('EMBEDDING_CREDENTIAL_UNAVAILABLE');
    await this.repository.writeEmbedding({
      tenantId: job.tenantId!,
      entityType: payload.entityType,
      entityId: payload.entityId,
      content: payload.content,
      metadata: payload.metadata,
      embeddingVersion: payload.embeddingVersion,
      vector,
    });
  }
}

function embeddingPayload(job: BackgroundJobRecord): EmbeddingJobPayload {
  if (job.type !== 'embedding' || !job.tenantId || !isEmbeddingPayload(job.payload)) {
    throw new ModelProviderError('JOB_PAYLOAD_INVALID');
  }
  return job.payload;
}

function isEmbeddingPayload(value: unknown): value is EmbeddingJobPayload {
  if (!isRecord(value) || value.schemaVersion !== 1) return false;
  return (
    stringValue(value.userId) &&
    stringValue(value.traceId) &&
    stringValue(value.entityType) &&
    stringValue(value.entityId) &&
    stringValue(value.content) &&
    stringValue(value.embeddingVersion) &&
    isRecord(value.metadata)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
