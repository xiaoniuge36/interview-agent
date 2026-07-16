import { Injectable } from '@nestjs/common';
import {
  PracticeRecommendationListSchema,
  type PracticeRecommendation,
} from '@interview-agent/contracts';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { classifyRole } from '../../common/role-category';
import { isPracticeCategoryTag, practiceCategoryTagFor } from './practice-question-categories';

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
      recommendationCandidates(job, profile, mastery),
      recentItems,
    );
    if (!selection) return [];
    const { recommendation, questions } = selection;
    return PracticeRecommendationListSchema.parse([
      {
        id: `recommendation-${recommendation.category ?? 'curated'}`,
        title: recommendationTitle(recommendation.category, recommendation.weakTag),
        reason: recommendationReason(
          recommendation.source,
          recommendation.role,
          recommendation.weakTag,
        ),
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
      select: { targetRole: true },
    });
  }

  private profile(context: ProductRequestContext) {
    return this.prisma.userProfile.findUnique({
      where: { tenantId_userId: { tenantId: context.tenantId, userId: context.actor.id } },
      select: { targetRole: true },
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
      select: { questionId: true },
    });
  }

  private questions(
    context: ProductRequestContext,
    input: RecommendationQuestionInput,
  ) {
    const requiredTags = [
      ...(input.category ? [practiceCategoryTagFor(input.category)] : []),
      ...(input.weakTag ? [input.weakTag] : []),
    ];
    return this.prisma.question.findMany({
      where: {
        status: 'published',
        OR: [{ tenantId: context.tenantId }, { visibility: 'public' }],
        ...(requiredTags.length ? { tags: { hasEvery: requiredTags } } : {}),
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
  recentItems: Array<{ questionId: string }>;
};

type RecommendationContext = ReturnType<typeof recommendationContext>;

function recommendationCandidates(
  job: { targetRole: string } | null,
  profile: { targetRole: string | null } | null,
  mastery: Array<{ tag: string; score: number }>,
) {
  const primary = recommendationContext(job, profile, mastery);
  const candidates: RecommendationContext[] = [primary];
  if (primary.weakTag && primary.category) {
    candidates.push({
      ...primary,
      weakTag: undefined,
      source: recommendationSource(Boolean(job), Boolean(profile), false),
    });
  }
  if (primary.category || primary.weakTag) {
    candidates.push({
      role: undefined,
      weakTag: undefined,
      category: null,
      source: 'curated',
    });
  }
  return candidates;
}

function recommendationContext(
  job: { targetRole: string } | null,
  profile: { targetRole: string | null } | null,
  mastery: Array<{ tag: string; score: number }>,
) {
  const role = job?.targetRole ?? profile?.targetRole ?? undefined;
  const weakTag = mastery.find((item) => !isPracticeCategoryTag(item.tag))?.tag;
  return {
    role,
    weakTag,
    category: role ? classifyRole(role) : null,
    source: recommendationSource(Boolean(job), Boolean(profile), Boolean(weakTag)),
  } as const;
}

function recommendationSource(hasJob: boolean, hasProfile: boolean, hasWeakTag: boolean) {
  if (hasWeakTag) return 'mastery' as const;
  if (hasJob) return 'job' as const;
  if (hasProfile) return 'profile' as const;
  return 'curated' as const;
}

function ownerScope(context: ProductRequestContext) {
  return { tenantId: context.tenantId, ownerId: context.actor.id };
}

function recommendationTitle(category: ReturnType<typeof classifyRole> | null, weakTag?: string) {
  if (weakTag) return `${weakTag}强化题单`;
  return category ? '目标岗位精选题单' : '通用面试精选题单';
}

function recommendationReason(source: string, role?: string, weakTag?: string) {
  if (source === 'mastery') return `最近「${weakTag}」能力得分偏低，建议优先补强。`;
  if (source === 'job') return `根据目标岗位「${role}」的核心考察方向生成。`;
  if (source === 'profile') return `根据个人档案中的目标「${role}」生成。`;
  return '根据当前公共题库的通用高价值题目生成。';
}
