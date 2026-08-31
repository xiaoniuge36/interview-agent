import {
  learningVerificationReturnHref,
  resolveLearningVerification,
  type LearningVerification,
} from '@/lib/learning/learning-verification';

type LearningPracticeReturnOrigin = Extract<LearningVerification, { status: 'ready' }>;

export type PracticeReturnOrigin = 'mistake-book' | LearningPracticeReturnOrigin | null;

const MISTAKE_BOOK_ORIGIN = 'mistake-book';
export const MISTAKE_BOOK_RETURN_ANCHOR_ID = 'mistake-book-heading';
export const MISTAKE_BOOK_RETURN_HREF = `/reports#${MISTAKE_BOOK_RETURN_ANCHOR_ID}`;

export function mistakeBookReviewPracticeHref(sessionId: string) {
  return `/practice?session=${encodeURIComponent(sessionId)}&origin=${MISTAKE_BOOK_ORIGIN}`;
}

export function practiceReturnOriginFromValues(
  origins: readonly string[],
  courses: readonly string[] = [],
  topics: readonly string[] = [],
): PracticeReturnOrigin {
  if (origins.length === 1 && origins[0] === MISTAKE_BOOK_ORIGIN) return MISTAKE_BOOK_ORIGIN;
  const learning = resolveLearningVerification({
    source: origins,
    course: courses,
    topic: topics,
  });
  return learning.status === 'ready' ? learning : null;
}

export function practiceReturnHref(origin: PracticeReturnOrigin) {
  if (origin === MISTAKE_BOOK_ORIGIN) return MISTAKE_BOOK_RETURN_HREF;
  if (origin?.status === 'ready') return learningVerificationReturnHref(origin.courseSlug);
  return null;
}

/** 练习进行中的返回入口：按来源回错题本/课程，无来源时回题库。 */
export function practiceReturnLink(origin: PracticeReturnOrigin): { href: string; label: string } {
  if (origin === MISTAKE_BOOK_ORIGIN)
    return { href: MISTAKE_BOOK_RETURN_HREF, label: '返回错题本' };
  if (origin?.status === 'ready') {
    return { href: learningVerificationReturnHref(origin.courseSlug), label: '返回本课' };
  }
  return { href: '/questions', label: '返回题库' };
}

export function isMistakeBookReturnHash(hash: string) {
  return hash === `#${MISTAKE_BOOK_RETURN_ANCHOR_ID}`;
}
