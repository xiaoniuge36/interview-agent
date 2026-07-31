import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { BackgroundJobRepository } from './job-repository';

const EMBEDDING_VERSION = 'v1';

export type EmbeddingJobPayload = {
  schemaVersion: 1;
  userId: string;
  traceId: string;
  entityType: string;
  entityId: string;
  content: string;
  metadata: Record<string, unknown>;
  embeddingVersion: string;
};

export type EmbeddingDispatchInput = Omit<
  EmbeddingJobPayload,
  'schemaVersion' | 'embeddingVersion'
> & {
  tenantId: string;
};

@Injectable()
export class BackgroundJobDispatcher {
  constructor(private readonly repository: BackgroundJobRepository) {}

  enqueueEmbedding(input: EmbeddingDispatchInput, transaction?: Prisma.TransactionClient) {
    const payload: EmbeddingJobPayload = {
      schemaVersion: 1,
      userId: input.userId,
      traceId: input.traceId,
      entityType: input.entityType,
      entityId: input.entityId,
      content: input.content,
      metadata: input.metadata,
      embeddingVersion: EMBEDDING_VERSION,
    };
    const job = {
      tenantId: input.tenantId,
      type: 'embedding' as const,
      dedupeKey: embeddingDedupeKey(payload),
      payload: payload as Prisma.InputJsonValue,
    };
    return transaction ? this.repository.enqueue(job, transaction) : this.repository.enqueue(job);
  }

  removeKnowledgeEmbeddings(
    tenantId: string,
    assetId: string,
    transaction?: Prisma.TransactionClient,
  ) {
    return transaction
      ? this.repository.removeKnowledgeEmbeddings(tenantId, assetId, transaction)
      : this.repository.removeKnowledgeEmbeddings(tenantId, assetId);
  }
}

function embeddingDedupeKey(payload: EmbeddingJobPayload) {
  const contentHash = createHash('sha256').update(payload.content).digest('hex');
  return `${payload.entityType}:${payload.entityId}:${contentHash}:${payload.embeddingVersion}`;
}
