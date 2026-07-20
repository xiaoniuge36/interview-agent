import { Injectable } from '@nestjs/common';
import {
  PracticeRecommendationListSchema,
  type PracticeRecommendation,
} from '@interview-agent/contracts';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { classifyRole } from '../../common/role-category';
import { practiceCategoryTagFor } from './practice-question-categories';
import {
  recommendationCandidates,
  recommendationReason,
  recommendationTitle,
  type RecommendationContext,
} from './practice-recommendation-context';

const QUESTION_COUNT = 5;
const MINUTES_PER_QUESTION = 4;
const RECENT_QUESTION_LIMIT = 20;

@Injectable()
export class PracticeRecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async list(context: ProductRequestContext): Promise<PracticeRecommendation[]> {
    this.policy.assert(context.actor, 'practice:read', ownerScope(context));
    const [job, profile, mastery, recentItems] = await Promise.all([
      this.latestJob(context),
      this.profile(context),
      this.lowMastery(context),
      this.recentQuestions(context),
    ]);
    const selection = await this.selectQuestions(
      context,
      recommendationCandidates({ job, profile, mastery, recentItems }),
      recentItems,
    );
    if (!selection) return [];
    const { recommendation, questions } = selection;
    return PracticeRecommendationListSchema.parse([
      {
        id: `recommendation-${recommendation.category ?? 'curated'}`,
        title: recommendationTitle(recommendation.category, recommendation.weakTag),
        reason: recommendationReason(recommendation),
        source: recommendation.source,
        category: recommendation.category,
        estimatedMinutes: questions.length * MINUTES_PER_QUESTION,
        questionIds: questions.map((question) => question.id),
      },
    ]);
  }

  private latestJob(context: ProductRequestContext) {
    return this.prisma.jobIntent.findFirst({
      where: { tenantId: context.tenantId, userId: context.actor.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        targetRole: true,
        profile: {
          select: { skillWeights: true, interviewFocus: true, riskSignals: true },
        },
      },
    });
  }

  private profile(context: ProductRequestContext) {
    return this.prisma.userProfile.findUnique({
      where: { tenantId_userId: { tenantId: context.tenantId, userId: context.actor.id } },
      select: {
        targetRole: true,
        techStacks: true,
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { weaknesses: true },
        },
      },
    });
  }

  private lowMastery(context: ProductRequestContext) {
    return this.prisma.masteryProfile.findMany({
      where: { tenantId: context.tenantId, userId: context.actor.id },
      orderBy: { score: 'asc' },
      take: 3,
      select: { tag: true, score: true },
    });
  }

  private recentQuestions(context: ProductRequestContext) {
    return this.prisma.practiceSessionItem.findMany({
      where: { tenantId: context.tenantId, session: { userId: context.actor.id } },
      orderBy: { updatedAt: 'desc' },
      take: RECENT_QUESTION_LIMIT,
      select: {
        questionId: true,
        evaluation: { select: { score: true } },
        question: { select: { tags: true } },
      },
    });
  }

  private questions(context: ProductRequestContext, input: RecommendationQuestionInput) {
    const requiredTags = [
      ...(input.category ? [practiceCategoryTagFor(input.category)] : []),
      ...(input.weakTag ? [input.weakTag] : []),
      ...(input.focusTag ? [input.focusTag] : []),
    ];
    return this.prisma.question.findMany({
      where: {
        status: 'published',
        OR: [{ tenantId: context.tenantId }, { visibility: 'public' }],
        ...(requiredTags.length ? { tags: { hasEvery: [...new Set(requiredTags)] } } : {}),
        ...(input.recentItems.length
          ? { id: { notIn: input.recentItems.map((item) => item.questionId) } }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: QUESTION_COUNT,
      select: { id: true, title: true },
    });
  }

  private async selectQuestions(
    context: ProductRequestContext,
    candidates: RecommendationContext[],
    recentItems: Array<{ questionId: string }>,
  ) {
    for (const recommendation of candidates) {
      const questions = await this.questions(context, {
        category: recommendation.category,
        weakTag: recommendation.weakTag,
        focusTag: recommendation.focusTag,
        recentItems,
      });
      if (questions.length) return { recommendation, questions };
    }
    return null;
  }
}

type RecommendationQuestionInput = {
  category: ReturnType<typeof classifyRole> | null;
  weakTag: string | undefined;
  focusTag: string | undefined;
  recentItems: Array<{ questionId: string }>;
};

function ownerScope(context: ProductRequestContext) {
  return { tenantId: context.tenantId, ownerId: context.actor.id };
}
