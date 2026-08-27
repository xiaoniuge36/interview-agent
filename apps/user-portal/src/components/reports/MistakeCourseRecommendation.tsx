import Link from 'next/link';
import type { MistakeBookItem } from '@interview-agent/contracts';
import { recommendCoursesForWeakness } from '@/lib/learning/learning-course-recommendation';

/** 把当前页错题的主题标签换算成学习课程入口，让低分证据直接接上补课动作。 */
export function MistakeCourseRecommendation({ items }: { items: readonly MistakeBookItem[] }) {
  const recommendations = recommendCoursesForWeakness(
    items.map((item) => ({ tags: item.questionSnapshot.tags, score: item.score })),
  );
  if (!recommendations.length) return null;
  return (
    <aside className="mistake-course-recommendation" aria-label="针对性补课">
      <span>针对性补课</span>
      <div>
        {recommendations.map((recommendation) => (
          <Link key={recommendation.courseSlug} href={recommendation.href}>
            <strong>去学《{recommendation.courseTitle}》</strong>
            <small>
              {recommendation.weakCount} 道低分题命中 {recommendation.topicLabel}
            </small>
          </Link>
        ))}
      </div>
    </aside>
  );
}
