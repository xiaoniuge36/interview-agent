import type { MasteryProfile } from '@interview-agent/contracts';

/** 掌握度达到该分数视为「已覆盖」JD 要求，低于则标记为「待补强」。 */
export const JD_COVERED_SCORE = 70;
const MIN_TAG_LENGTH = 2;
const DEFAULT_MATCH_LIMIT = 12;

export type JdMatchItem = {
  tag: string;
  score: number;
  evidenceCount: number;
};

export type JdMatchResult = {
  covered: JdMatchItem[];
  gaps: JdMatchItem[];
};

/**
 * 把用户练习沉淀的能力掌握度（mastery tag）对照 JD 文本做匹配标注。
 * 命中规则：标签作为子串出现在 JD 上下文中（大小写不敏感），过短标签跳过以避免误报。
 */
export function matchJdWithMastery(
  jdContext: string,
  profiles: readonly MasteryProfile[],
  limit = DEFAULT_MATCH_LIMIT,
): JdMatchResult {
  const context = jdContext.toLowerCase();
  if (!context.trim()) return { covered: [], gaps: [] };
  const matched = profiles
    .filter((profile) => {
      const tag = profile.tag.trim().toLowerCase();
      return tag.length >= MIN_TAG_LENGTH && context.includes(tag);
    })
    .map((profile) => ({
      tag: profile.tag,
      score: Math.round(profile.score),
      evidenceCount: profile.evidenceCount,
    }));
  const covered = matched
    .filter((item) => item.score >= JD_COVERED_SCORE)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
  const gaps = matched
    .filter((item) => item.score < JD_COVERED_SCORE)
    .sort((left, right) => left.score - right.score)
    .slice(0, limit);
  return { covered, gaps };
}
