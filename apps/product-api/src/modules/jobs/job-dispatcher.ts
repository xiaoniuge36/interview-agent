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

  enqueueEmbedding(input: EmbeddingDispatchInput) {
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
    return this.repository.enqueue({
      tenantId: input.tenantId,
      type: 'embedding',
      dedupeKey: embeddingDedupeKey(payload),
      payload: payload as Prisma.InputJsonValue,
    });
  }
}

function embeddingDedupeKey(payload: EmbeddingJobPayload) {
  const contentHash = createHash('sha256').update(payload.content).digest('hex');
  return `${payload.entityType}:${payload.entityId}:${contentHash}:${payload.embeddingVersion}`;
}
