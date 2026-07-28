import { SkillWeightSchema, type PracticeRecommendationEvidence } from '@interview-agent/contracts';
import { classifyRole } from '../../common/role-category';
import { isPracticeCategoryTag } from './practice-question-categories';

const RECENT_WEAK_SCORE = 60;
const MASTERY_WEAK_SCORE = 60;
const MAX_RECOMMENDATION_EVIDENCE = 4;

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
  sessionId?: string;
  evaluation?: { score: number } | null;
  question?: { tags: string[] };
};

export type MasteryRecommendationSignal = {
  tag: string;
  score: number;
  evidenceCount?: number;
  lastEvidenceEventId?: string | null;
  lastEvidenceSessionId?: string | null;
  trend?: 'rising' | 'stable' | 'falling' | null;
};

export type RecommendationInput = {
  job: JobRecommendationContext | null;
  profile: ProfileRecommendationContext | null;
  mastery: MasteryRecommendationSignal[];
  recentItems: RecentPracticeSignal[];
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

export function recommendationCandidates(input: RecommendationInput) {
  const { job, profile, mastery, recentItems } = input;
  const role = job?.targetRole ?? profile?.targetRole ?? undefined;
  const category = role ? classifyRole(role) : null;
  const base = { job, profile, role, category };
  const weakTags = unique([
    ...recentWeakTags(recentItems),
    ...mastery
      .filter((item) => item.score < MASTERY_WEAK_SCORE && !isPracticeCategoryTag(item.tag))
      .map((item) => item.tag),
  ]);
  const focusTags = unique([...jobFocusTags(job), ...profileFocusTags(profile)]);
  const candidates = weakTags.flatMap((weakTag) => candidatesForWeakTag(base, weakTag, focusTags));
  const primaryFocus = focusTags[0];
  if (primaryFocus) candidates.push(recommendationContext(base, undefined, primaryFocus));
  if (category) candidates.push(recommendationContext(base, undefined, undefined));
  candidates.push(curatedContext());
  return uniqueContexts(candidates);
}

export function recommendationEvidence(
  context: RecommendationContext,
  input: RecommendationInput,
): PracticeRecommendationEvidence[] {
  const evidence = [
    ...masteryEvidence(context, input.mastery),
    ...recentPracticeEvidence(context, input.recentItems),
    ...focusEvidence(context, input),
  ];
  return (evidence.length ? evidence : curatedEvidence()).slice(0, MAX_RECOMMENDATION_EVIDENCE);
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

function masteryEvidence(context: RecommendationContext, mastery: MasteryRecommendationSignal[]) {
  const signal = mastery.find((item) => item.tag === context.weakTag);
  if (!signal) return [];
  return [
    {
      type: 'mastery' as const,
      sourceId:
        signal.lastEvidenceEventId ?? signal.lastEvidenceSessionId ?? `mastery:${signal.tag}`,
      label: `${signal.tag} 掌握度 ${Math.round(signal.score)} 分`,
      detail: `来自 ${signal.evidenceCount ?? 0} 条训练证据，当前趋势${trendLabel(signal.trend)}。`,
    },
  ];
}

function recentPracticeEvidence(context: RecommendationContext, items: RecentPracticeSignal[]) {
  const signal = items.find(
    (item) =>
      item.evaluation &&
      item.evaluation.score < RECENT_WEAK_SCORE &&
      item.question?.tags.includes(context.weakTag ?? ''),
  );
  if (!signal?.evaluation) return [];
  return [
    {
      type: 'practice' as const,
      sourceId: signal.sessionId ?? signal.questionId,
      label: `最近相关练习得分 ${Math.round(signal.evaluation.score)} 分`,
      detail: `题目覆盖「${context.weakTag}」能力标签。`,
    },
  ];
}

function focusEvidence(context: RecommendationContext, input: RecommendationInput) {
  const tag = context.focusTag;
  if (!tag) return [];
  if (jobFocusTags(input.job).includes(tag)) {
    return [
      {
        type: 'job' as const,
        sourceId: 'job:latest',
        label: `JD 重点能力「${tag}」`,
        detail: '来自最近目标岗位配置。',
      },
    ];
  }
  if (profileFocusTags(input.profile).includes(tag)) {
    return [
      {
        type: 'profile' as const,
        sourceId: 'profile:current',
        label: `个人档案关注「${tag}」`,
        detail: '来自当前个人档案与复盘。',
      },
    ];
  }
  return [];
}

function curatedEvidence(): PracticeRecommendationEvidence[] {
  return [
    {
      type: 'curated',
      sourceId: 'catalog:curated',
      label: '通用高价值题目',
      detail: '当前没有足够的个性化证据。',
    },
  ];
}

function trendLabel(trend: MasteryRecommendationSignal['trend']) {
  if (trend === 'rising') return '上升';
  if (trend === 'falling') return '下降';
  return '稳定';
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
