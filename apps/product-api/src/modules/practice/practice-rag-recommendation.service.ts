import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PracticeRecommendationEvidence } from '@interview-agent/contracts';
import type { Environment } from '../../common/config/environment';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { RetrievalService } from '../retrieval/retrieval.service';
import type { RecommendationContext } from './practice-recommendation-context';

const RAG_RECOMMENDATION_LIMIT = 5;
const RAG_EVIDENCE_LIMIT = 4;

export type RuleRecommendationSelection = {
  recommendation: RecommendationContext;
  questions: Array<{ id: string; title: string }>;
};

export type HybridRecommendationSelection = RuleRecommendationSelection & {
  algorithm: 'hybrid';
  evidence: PracticeRecommendationEvidence[];
};

@Injectable()
export class PracticeRagRecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Environment, true>,
    private readonly retrieval: RetrievalService,
  ) {}

  async enhance(
    context: ProductRequestContext,
    rules: RuleRecommendationSelection,
    recentQuestionIds: string[],
  ): Promise<HybridRecommendationSelection | null> {
    if (!this.config.get('RAG_TRAINING_ENABLED', { infer: true })) return null;
    try {
      const response = await this.retrieval.search(context, {
        query: recommendationQuery(rules.recommendation),
        purpose: 'training',
        limit: RAG_RECOMMENDATION_LIMIT,
      });
      const questionHits = response.hits.filter((hit) => hit.entityType === 'question');
      if (!questionHits.length) return null;
      const questions = await this.visibleQuestions(
        context.tenantId,
        questionHits.map((hit) => hit.entityId),
        recentQuestionIds,
      );
      if (!questions.length) return null;
      const hitsByQuestion = new Map<string, (typeof questionHits)[number]>();
      questionHits.forEach((hit) => {
        if (!hitsByQuestion.has(hit.entityId)) hitsByQuestion.set(hit.entityId, hit);
      });
      return {
        ...rules,
        algorithm: 'hybrid',
        questions,
        evidence: questions.slice(0, RAG_EVIDENCE_LIMIT).map((question) => ({
          type: 'retrieval',
          sourceId: hitsByQuestion.get(question.id)?.id ?? `question:${question.id}`,
          label: question.title,
          detail: '来自当前租户可见题库的混合检索命中。',
        })),
      };
    } catch {
      return null;
    }
  }

  private async visibleQuestions(tenantId: string, ids: string[], recentIds: string[]) {
    const uniqueIds = [...new Set(ids)];
    const records = await this.prisma.question.findMany({
      where: {
        status: 'published',
        id: { in: uniqueIds, ...(recentIds.length ? { notIn: recentIds } : {}) },
        OR: [{ tenantId }, { visibility: 'public' }],
      },
      select: { id: true, title: true },
    });
    const byId = new Map(records.map((record) => [record.id, record]));
    return uniqueIds
      .flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
      .slice(0, RAG_RECOMMENDATION_LIMIT);
  }
}

function recommendationQuery(context: RecommendationContext) {
  return [context.role, context.weakTag, context.focusTag, 'interview question']
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ');
}
