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

export function isMistakeBookReturnHash(hash: string) {
  return hash === `#${MISTAKE_BOOK_RETURN_ANCHOR_ID}`;
}
