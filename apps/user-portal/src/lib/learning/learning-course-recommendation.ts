import { REVIEWABLE_WEAK_SCORE } from '../weakness-review';
import { learningCourseForTag } from './learning-verification';

/** 一条可参与课程推荐的弱项信号：题目标签 + 该题得分。 */
export type WeaknessSignal = {
  tags: readonly string[];
  score: number;
};

export type WeakCourseRecommendation = {
  courseSlug: string;
  courseTitle: string;
  topicLabel: string;
  href: string;
  weakCount: number;
  lowestScore: number;
};

const DEFAULT_RECOMMENDATION_LIMIT = 2;

/**
 * 把低分题按主题标签换算成学习课程推荐：
 * 低分题命中越多的课程越靠前，同分时按最低分升序（更薄弱优先）。
 */
export function recommendCoursesForWeakness(
  signals: readonly WeaknessSignal[],
  options: { limit?: number } = {},
): WeakCourseRecommendation[] {
  const limit = options.limit ?? DEFAULT_RECOMMENDATION_LIMIT;
  const byCourse = new Map<string, WeakCourseRecommendation>();
  for (const signal of signals) {
    if (signal.score >= REVIEWABLE_WEAK_SCORE) continue;
    for (const course of coursesForSignal(signal)) {
      const existing = byCourse.get(course.slug);
      if (existing) {
        existing.weakCount += 1;
        existing.lowestScore = Math.min(existing.lowestScore, signal.score);
      } else {
        byCourse.set(course.slug, {
          courseSlug: course.slug,
          courseTitle: course.title,
          topicLabel: course.topicLabel,
          href: learningCourseHref(course.slug),
          weakCount: 1,
          lowestScore: signal.score,
        });
      }
    }
  }
  return [...byCourse.values()]
    .sort((a, b) => b.weakCount - a.weakCount || a.lowestScore - b.lowestScore)
    .slice(0, limit);
}

/** 同一道题的多个标签若指向同一课程，只计一次弱项。 */
function coursesForSignal(signal: WeaknessSignal) {
  const seen = new Map<string, NonNullable<ReturnType<typeof learningCourseForTag>>>();
  for (const tag of signal.tags) {
    const course = learningCourseForTag(tag);
    if (course && !seen.has(course.slug)) seen.set(course.slug, course);
  }
  return seen.values();
}

export function learningCourseHref(courseSlug: string) {
  return `/learn?doc=${encodeURIComponent(courseSlug)}`;
}
