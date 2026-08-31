import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import type { Span } from '@opentelemetry/api';
import {
  RetrievalResponseSchema,
  type RetrievalQuery,
  type RetrievalResponse,
} from '@interview-agent/contracts';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { errorCategory, withTraceSpan } from '../../common/telemetry/telemetry';
import { EmbeddingClient } from './embedding-client';
import { mergeRankedHits, type RankedRetrievalHit } from './retrieval-ranking';
import { RetrievalRepository } from './retrieval-repository';

const RETRIEVAL_POLICY_VERSION = 'v1';
const ENTITY_TYPES_BY_PURPOSE: Record<RetrievalQuery['purpose'], string[]> = {
  training: ['question', 'knowledge'],
  interview: ['question', 'knowledge', 'jd'],
  report: ['knowledge', 'memory'],
};
const ACTION_BY_PURPOSE = {
  training: 'practice:read',
  interview: 'interview:read',
  report: 'practice:read',
} as const;

export type RetrievalScope = {
  tenantId: string;
  entityTypes: string[];
  limit: number;
  query: string;
};

export type RetrievalLogInput = {
  tenantId: string;
  userId: string;
  purpose: RetrievalQuery['purpose'];
  queryHash: string;
  hitIds: string[];
  policyVersion: string;
  latencyMs: number;
  traceId: string;
};

type RetrievalLogAttempt = {
  context: ProductRequestContext;
  query: RetrievalQuery;
  hitIds: string[];
  startedAt: number;
};

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private readonly repository: RetrievalRepository,
    private readonly embeddings: EmbeddingClient,
    private readonly policy: PolicyService,
  ) {}

  async search(context: ProductRequestContext, query: RetrievalQuery): Promise<RetrievalResponse> {
    const startedAt = performance.now();
    return withTraceSpan(
      'retrieval.search',
      retrievalSpanAttributes(context, query),
      async (span) => {
        const response = await this.searchScoped({ context, query, startedAt, span });
        span.setAttributes({
          'retrieval.hit_count': response.hits.length,
          'retrieval.latency_ms': elapsed(startedAt),
        });
        return response;
      },
    );
  }

  private async searchScoped(input: {
    context: ProductRequestContext;
    query: RetrievalQuery;
    startedAt: number;
    span: Span;
  }): Promise<RetrievalResponse> {
    const { context, query, startedAt, span } = input;
    this.policy.assert(context.actor, ACTION_BY_PURPOSE[query.purpose], {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
    const scope = {
      tenantId: context.tenantId,
      entityTypes: ENTITY_TYPES_BY_PURPOSE[query.purpose],
      limit: query.limit,
      query: query.query,
    };
    const keywordHits = await this.repository.searchKeyword(scope);
    const embedding = await this.embeddingOrNull(context, query.query);
    // 向量缺位有两种形态：未配置凭证（vector_used=false）与调用失败（vector_degraded=true），排障时必须可区分
    span.setAttributes({
      'retrieval.vector_used': embedding.vector !== null,
      'retrieval.vector_degraded': embedding.degraded,
    });
    const vectorHits = embedding.vector
      ? await this.repository.searchVector(scope, embedding.vector)
      : [];
    const hits = mergeRankedHits(
      scopeHits(keywordHits, context.tenantId),
      scopeHits(vectorHits, context.tenantId),
      query.limit,
    );
    await this.recordSafely({
      context,
      query,
      hitIds: hits.map((hit) => hit.id),
      startedAt,
    });
    return RetrievalResponseSchema.parse({ hits });
  }

  private async embeddingOrNull(
    context: ProductRequestContext,
    text: string,
  ): Promise<{ vector: number[] | null; degraded: boolean }> {
    try {
      const vector = await this.embeddings.embed({
        tenantId: context.tenantId,
        userId: context.actor.id,
        traceId: context.traceId,
        text,
      });
      return { vector, degraded: false };
    } catch (error) {
      this.logger.warn(
        `Embedding lookup failed; degraded to keyword-only retrieval: ${errorCategory(error)} (tenant=${context.tenantId}, trace=${context.traceId})`,
      );
      return { vector: null, degraded: true };
    }
  }

  private async recordSafely(attempt: RetrievalLogAttempt) {
    try {
      await this.repository.recordLog({
        tenantId: attempt.context.tenantId,
        userId: attempt.context.actor.id,
        purpose: attempt.query.purpose,
        queryHash: hashQuery(attempt.query.query),
        hitIds: attempt.hitIds,
        policyVersion: RETRIEVAL_POLICY_VERSION,
        latencyMs: elapsed(attempt.startedAt),
        traceId: attempt.context.traceId,
      });
    } catch (error) {
      this.logger.warn(
        `Retrieval log write failed; hits already returned to caller: ${errorCategory(error)} (tenant=${attempt.context.tenantId}, trace=${attempt.context.traceId})`,
      );
    }
  }
}

function scopeHits(hits: RankedRetrievalHit[], tenantId: string) {
  return hits.filter((hit) => hit.tenantId === tenantId);
}

function hashQuery(query: string) {
  return createHash('sha256').update(query).digest('hex');
}

function retrievalSpanAttributes(context: ProductRequestContext, query: RetrievalQuery) {
  return {
    'interview_agent.trace_id': context.traceId,
    'retrieval.purpose': query.purpose,
    'retrieval.query_hash': hashQuery(query.query),
    'retrieval.query_length': query.query.length,
  };
}

function elapsed(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}
