import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { RankedRetrievalHit } from './retrieval-ranking';
import type { RetrievalLogInput, RetrievalScope } from './retrieval.service';
import { PrismaService } from '../../common/database/prisma.service';

const EMBEDDING_DIMENSIONS = 1536;

type RawRetrievalRow = {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  content: string;
  metadata: unknown;
  score: number;
};

export type EmbeddingProjectionInput = {
  tenantId: string;
  entityType: string;
  entityId: string;
  content: string;
  metadata: Record<string, unknown>;
  embeddingVersion: string;
  vector: number[];
};

@Injectable()
export class RetrievalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchKeyword(scope: RetrievalScope): Promise<RankedRetrievalHit[]> {
    const rows = await this.prisma.$queryRaw<RawRetrievalRow[]>(Prisma.sql`
      SELECT "id", "tenantId", "entityType", "entityId", "content", "metadata",
        ts_rank_cd(to_tsvector('simple', "content"), plainto_tsquery('simple', ${scope.query}))::float AS "score"
      FROM "RetrievalChunk"
      WHERE "tenantId" = ${scope.tenantId} AND "status" = 'ready'
        AND "entityType" IN (${Prisma.join(scope.entityTypes)})
        AND to_tsvector('simple', "content") @@ plainto_tsquery('simple', ${scope.query})
      ORDER BY "score" DESC, "id" ASC LIMIT ${scope.limit}
    `);
    return rows.map(mapRow);
  }

  async searchVector(scope: RetrievalScope, vector: number[]): Promise<RankedRetrievalHit[]> {
    const literal = vectorLiteral(vector);
    if (!literal) return [];
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw(Prisma.sql`SET LOCAL hnsw.iterative_scan = 'strict_order'`);
      const rows = await transaction.$queryRaw<RawRetrievalRow[]>(Prisma.sql`
        SELECT "id", "tenantId", "entityType", "entityId", "content", "metadata",
          (1 - ("embedding" <=> ${literal}::vector))::float AS "score"
        FROM "RetrievalChunk"
        WHERE "tenantId" = ${scope.tenantId} AND "status" = 'ready' AND "embedding" IS NOT NULL
          AND "entityType" IN (${Prisma.join(scope.entityTypes)})
        ORDER BY "embedding" <=> ${literal}::vector, "id" ASC LIMIT ${scope.limit}
      `);
      return rows.map(mapRow);
    });
  }

  async writeEmbedding(input: EmbeddingProjectionInput): Promise<void> {
    const contentHash = createHash('sha256').update(input.content).digest('hex');
    const chunk = await this.prisma.retrievalChunk.upsert({
      where: {
        tenantId_entityType_entityId_embeddingVersion: {
          tenantId: input.tenantId,
          entityType: input.entityType,
          entityId: input.entityId,
          embeddingVersion: input.embeddingVersion,
        },
      },
      create: projectionData(input, contentHash),
      update: { ...projectionData(input, contentHash), status: 'pending' },
    });
    const literal = vectorLiteral(input.vector);
    if (!literal) throw new Error('EMBEDDING_DIMENSION_INVALID');
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "RetrievalChunk" SET "embedding" = ${literal}::vector, "status" = 'ready'
      WHERE "id" = ${chunk.id} AND "tenantId" = ${input.tenantId}
    `);
  }

  async recordLog(input: RetrievalLogInput): Promise<void> {
    await this.prisma.retrievalLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        purpose: input.purpose,
        queryHash: input.queryHash,
        hitIds: input.hitIds,
        policyVersion: input.policyVersion,
        latencyMs: input.latencyMs,
        traceId: input.traceId,
      },
    });
  }
}

function projectionData(input: EmbeddingProjectionInput, contentHash: string) {
  return {
    tenantId: input.tenantId,
    entityType: input.entityType,
    entityId: input.entityId,
    content: input.content,
    contentHash,
    embeddingVersion: input.embeddingVersion,
    metadata: input.metadata as Prisma.InputJsonValue,
  };
}

function mapRow(row: RawRetrievalRow): RankedRetrievalHit {
  return {
    id: row.id,
    tenantId: row.tenantId,
    entityType: row.entityType,
    entityId: row.entityId,
    content: row.content,
    metadata: objectValue(row.metadata),
    score: Math.max(0, Math.min(1, row.score)),
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function vectorLiteral(vector: number[]) {
  if (vector.length !== EMBEDDING_DIMENSIONS || vector.some((value) => !Number.isFinite(value))) {
    return null;
  }
  return `[${vector.join(',')}]`;
}
