import Link from 'next/link';
import type { PracticeSession } from '@interview-agent/contracts';
import { recommendCoursesForWeakness } from '@/lib/learning/learning-course-recommendation';

/** 复盘完成后，把本轮低分题换算成一门最值得补的学习课程。 */
export function PracticeCourseRecommendation({ session }: { session: PracticeSession }) {
  const [recommendation] = recommendCoursesForWeakness(
    session.items
      .filter((item) => item.evaluation)
      .map((item) => ({ tags: item.question.tags, score: item.evaluation!.score })),
    { limit: 1 },
  );
  if (!recommendation) return null;
  return (
    <div className="practice-course-recommendation">
      <span>针对性补课</span>
      <Link href={recommendation.href}>去学《{recommendation.courseTitle}》</Link>
      <small>
        {recommendation.weakCount} 道低分题命中 {recommendation.topicLabel}，先补课再复练更稳。
      </small>
    </div>
  );
}
