import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ProductRequestContext } from '../../common/context/request-context';
import { runSerializable } from '../../common/database/serializable-transaction';
import { BackgroundJobDispatcher } from '../jobs/job-dispatcher';
import { sourceChunkSequence } from '../import/import-mappers';
import { CandidateReviewInfrastructure } from './candidate-review-infrastructure';

type KnowledgeAssetRecord = {
  id: string;
  tenantId: string;
  status: string;
};

type SourceChunk = {
  content: string;
  metadata: Prisma.JsonValue;
};

@Injectable()
export class KnowledgeAssetLifecycleService {
  constructor(
    private readonly infrastructure: CandidateReviewInfrastructure,
    private readonly jobs: BackgroundJobDispatcher,
  ) {}

  async publish(context: ProductRequestContext, assetId: string) {
    this.assertPublishPermission(context);
    return runSerializable(this.infrastructure.prisma, async (transaction) => {
      const asset = await this.loadAsset(transaction, context.tenantId, assetId);
      if (asset.status !== 'review' && asset.status !== 'published') throw assetNotReviewable();
      if (asset.status === 'review') {
        await this.setStatus(transaction, {
          tenantId: context.tenantId,
          assetId,
          status: 'published',
        });
      }
      const chunks = await transaction.knowledgeChunk.findMany({
        where: { tenantId: context.tenantId, assetId },
        select: { content: true, metadata: true },
        orderBy: { createdAt: 'asc' },
      });
      await this.enqueueChunks({ context, assetId, chunks, transaction });
      await this.infrastructure.audit.record(
        context,
        {
          action: 'question:write',
          resourceType: 'KnowledgeAsset',
          resourceId: assetId,
          stateTransition: { from: asset.status, to: 'published', version: 1 },
        },
        transaction,
      );
      return { id: assetId, status: 'published' as const };
    });
  }

  async unpublish(context: ProductRequestContext, assetId: string) {
    this.assertPublishPermission(context);
    return runSerializable(this.infrastructure.prisma, async (transaction) => {
      const asset = await this.loadAsset(transaction, context.tenantId, assetId);
      if (asset.status !== 'review' && asset.status !== 'published') throw assetNotReviewable();
      if (asset.status === 'published') {
        await this.setStatus(transaction, {
          tenantId: context.tenantId,
          assetId,
          status: 'review',
        });
      }
      await transaction.retrievalChunk.deleteMany({
        where: knowledgeProjectionScope(context.tenantId, assetId),
      });
      await this.jobs.removeKnowledgeEmbeddings(context.tenantId, assetId, transaction);
      await this.infrastructure.audit.record(
        context,
        {
          action: 'question:write',
          resourceType: 'KnowledgeAsset',
          resourceId: assetId,
          stateTransition: { from: asset.status, to: 'review', version: 1 },
        },
        transaction,
      );
      return { id: assetId, status: 'review' as const };
    });
  }

  private async loadAsset(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    assetId: string,
  ): Promise<KnowledgeAssetRecord> {
    const asset = await transaction.knowledgeAsset.findFirst({ where: { id: assetId, tenantId } });
    if (asset) return asset;
    throw new NotFoundException({ code: 'KNOWLEDGE_ASSET_NOT_FOUND' });
  }

  private setStatus(
    transaction: Prisma.TransactionClient,
    input: { tenantId: string; assetId: string; status: 'published' | 'review' },
  ) {
    return transaction.knowledgeAsset.update({
      where: { tenantId_id: { tenantId: input.tenantId, id: input.assetId } },
      data: { status: input.status },
    });
  }

  private async enqueueChunks(input: {
    context: ProductRequestContext;
    assetId: string;
    chunks: SourceChunk[];
    transaction: Prisma.TransactionClient;
  }) {
    for (const [index, chunk] of input.chunks.entries()) {
      const sequence = sourceChunkSequence(chunk.metadata, index + 1);
      await this.jobs.enqueueEmbedding(
        {
          tenantId: input.context.tenantId,
          userId: input.context.actor.id,
          traceId: input.context.traceId,
          entityType: 'knowledge',
          entityId: `${input.assetId}:${sequence}`,
          content: chunk.content,
          metadata: { source: 'knowledge_asset_publish', assetId: input.assetId, sequence },
        },
        input.transaction,
      );
    }
  }

  private assertPublishPermission(context: ProductRequestContext) {
    this.infrastructure.policy.assert(context.actor, 'candidate:review', {
      tenantId: context.tenantId,
    });
    this.infrastructure.policy.assert(context.actor, 'question:write', {
      tenantId: context.tenantId,
    });
    if (context.actor.role === 'admin' || context.actor.role === 'platform_admin') return;
    throw new ForbiddenException({ code: 'ROLE_NOT_ALLOWED' });
  }
}

function knowledgeProjectionScope(tenantId: string, assetId: string) {
  return {
    tenantId,
    entityType: 'knowledge',
    metadata: { path: ['assetId'], equals: assetId },
  };
}

function assetNotReviewable() {
  return new BadRequestException({ code: 'KNOWLEDGE_ASSET_NOT_REVIEW' });
}
