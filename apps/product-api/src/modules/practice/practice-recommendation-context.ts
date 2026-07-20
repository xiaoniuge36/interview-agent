import { SkillWeightSchema } from '@interview-agent/contracts';
import { classifyRole } from '../../common/role-category';
import { isPracticeCategoryTag } from './practice-question-categories';

const RECENT_WEAK_SCORE = 60;

export type JobRecommendationContext = {
  targetRole: string;
  profile?: {
    skillWeights: unknown;
    interviewFocus: string[];
    riskSignals: string[];
  } | null;
};

export type ProfileRecommendationContext = {
  targetRole: string | null;
  techStacks?: string[];
  snapshots?: Array<{ weaknesses: string[] }>;
};

export type RecentPracticeSignal = {
  questionId: string;
  evaluation?: { score: number } | null;
  question?: { tags: string[] };
};

export type RecommendationContext = {
  role: string | undefined;
  weakTag: string | undefined;
  focusTag: string | undefined;
  category: ReturnType<typeof classifyRole> | null;
  source: ReturnType<typeof recommendationSource>;
};

type RecommendationBase = {
  job: JobRecommendationContext | null;
  profile: ProfileRecommendationContext | null;
  role: string | undefined;
  category: ReturnType<typeof classifyRole> | null;
};

export function recommendationCandidates(input: {
  job: JobRecommendationContext | null;
  profile: ProfileRecommendationContext | null;
  mastery: Array<{ tag: string; score: number }>;
  recentItems: RecentPracticeSignal[];
}) {
  const { job, profile, mastery, recentItems } = input;
  const role = job?.targetRole ?? profile?.targetRole ?? undefined;
  const category = role ? classifyRole(role) : null;
  const base = { job, profile, role, category };
  const weakTags = unique([
    ...recentWeakTags(recentItems),
    ...mastery.filter((item) => !isPracticeCategoryTag(item.tag)).map((item) => item.tag),
  ]);
  const focusTags = unique([...jobFocusTags(job), ...profileFocusTags(profile)]);
  const candidates = weakTags.flatMap((weakTag) => candidatesForWeakTag(base, weakTag, focusTags));
  const primaryFocus = focusTags[0];
  if (primaryFocus) candidates.push(recommendationContext(base, undefined, primaryFocus));
  if (category) candidates.push(recommendationContext(base, undefined, undefined));
  candidates.push(curatedContext());
  return uniqueContexts(candidates);
}

export function recommendationTitle(
  category: ReturnType<typeof classifyRole> | null,
  weakTag?: string,
) {
  if (weakTag) return `${weakTag}强化题单`;
  return category ? '目标岗位精选题单' : '通用面试精选题单';
}

export function recommendationReason(context: RecommendationContext) {
  if (context.source === 'curated') return '根据当前公共题库的通用高价值题目生成。';
  const parts: string[] = [];
  if (context.role) parts.push(`按最近目标岗位「${context.role}」匹配`);
  if (context.focusTag) parts.push(`重点覆盖 JD 或个人档案中的「${context.focusTag}」`);
  if (context.weakTag) {
    parts.push(`结合最近训练与掌握度，「${context.weakTag}」仍需强化`);
  }
  parts.push('已避开近期练过的题目');
  return `${parts.join('；')}。`;
}

function candidatesForWeakTag(base: RecommendationBase, weakTag: string, focusTags: string[]) {
  const focusTag = focusTags.find((tag) => tag !== weakTag);
  const combined = recommendationContext(base, weakTag, focusTag);
  return focusTag ? [combined, recommendationContext(base, weakTag, undefined)] : [combined];
}

function recommendationContext(
  base: RecommendationBase,
  weakTag: string | undefined,
  focusTag: string | undefined,
): RecommendationContext {
  return {
    role: base.role,
    weakTag,
    focusTag,
    category: base.category,
    source: recommendationSource(Boolean(base.job), Boolean(base.profile), Boolean(weakTag)),
  };
}

function curatedContext(): RecommendationContext {
  return {
    role: undefined,
    weakTag: undefined,
    focusTag: undefined,
    category: null,
    source: 'curated',
  };
}

function recentWeakTags(items: RecentPracticeSignal[]) {
  return unique(
    items.flatMap((item) => {
      if (!item.evaluation || item.evaluation.score >= RECENT_WEAK_SCORE) return [];
      return (item.question?.tags ?? []).filter((tag) => !isPracticeCategoryTag(tag));
    }),
  );
}

function jobFocusTags(job: JobRecommendationContext | null) {
  const weighted = SkillWeightSchema.array().safeParse(job?.profile?.skillWeights);
  const skillTags = weighted.success
    ? [...weighted.data].sort((left, right) => right.weight - left.weight).map((item) => item.skill)
    : [];
  return cleanTags([...skillTags, ...(job?.profile?.interviewFocus ?? [])]);
}

function profileFocusTags(profile: ProfileRecommendationContext | null) {
  return cleanTags([
    ...(profile?.snapshots?.[0]?.weaknesses ?? []),
    ...(profile?.techStacks ?? []),
  ]);
}

function cleanTags(tags: string[]) {
  return unique(tags.map((tag) => tag.trim()).filter(Boolean)).filter(
    (tag) => !isPracticeCategoryTag(tag),
  );
}

function uniqueContexts(contexts: RecommendationContext[]) {
  const seen = new Set<string>();
  return contexts.filter((context) => {
    const key = [context.category, context.weakTag, context.focusTag].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recommendationSource(hasJob: boolean, hasProfile: boolean, hasWeakTag: boolean) {
  if (hasWeakTag) return 'mastery' as const;
  if (hasJob) return 'job' as const;
  if (hasProfile) return 'profile' as const;
  return 'curated' as const;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}
