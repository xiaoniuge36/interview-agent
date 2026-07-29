import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  RetrievalResponseSchema,
  type RetrievalQuery,
  type RetrievalResponse,
} from '@interview-agent/contracts';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { safeTextPreview } from '../../common/security/sensitive-data';
import { withTraceSpan } from '../../common/telemetry/telemetry';
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
  constructor(
    private readonly repository: RetrievalRepository,
    private readonly embeddings: EmbeddingClient,
    private readonly policy: PolicyService,
  ) {}

  async search(context: ProductRequestContext, query: RetrievalQuery): Promise<RetrievalResponse> {
    return withTraceSpan(
      'retrieval.search',
      {
        'interview_agent.trace_id': context.traceId,
        'retrieval.purpose': query.purpose,
        'retrieval.limit': query.limit,
        'retrieval.query_preview': safeTextPreview(query.query),
      },
      () => this.searchScoped(context, query),
    );
  }

  private async searchScoped(
    context: ProductRequestContext,
    query: RetrievalQuery,
  ): Promise<RetrievalResponse> {
    this.policy.assert(context.actor, ACTION_BY_PURPOSE[query.purpose], {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
    const startedAt = performance.now();
    const scope = {
      tenantId: context.tenantId,
      entityTypes: ENTITY_TYPES_BY_PURPOSE[query.purpose],
      limit: query.limit,
      query: query.query,
    };
    const keywordHits = await this.repository.searchKeyword(scope);
    const vector = await this.embeddingOrNull(context, query.query);
    const vectorHits = vector ? await this.repository.searchVector(scope, vector) : [];
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

  private async embeddingOrNull(context: ProductRequestContext, text: string) {
    try {
      return await this.embeddings.embed({
        tenantId: context.tenantId,
        userId: context.actor.id,
        traceId: context.traceId,
        text,
      });
    } catch {
      return null;
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
    } catch {
      return;
    }
  }
}

function scopeHits(hits: RankedRetrievalHit[], tenantId: string) {
  return hits.filter((hit) => hit.tenantId === tenantId);
}

function hashQuery(query: string) {
  return createHash('sha256').update(query).digest('hex');
}

function elapsed(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}
