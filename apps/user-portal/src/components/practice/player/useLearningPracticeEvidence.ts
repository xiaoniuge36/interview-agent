'use client';

import { useEffect, useMemo } from 'react';
import type { PracticeReport, PracticeSession } from '@interview-agent/contracts';
import { browserLearningProgressStorage } from '@/lib/learning/learning-progress';
import {
  persistLearningPracticeEvidence,
  type LearningPracticeOrigin,
} from './practice-learning-evidence';
import type { PracticeReturnOrigin } from './practice-return-origin';

export function useLearningPracticeEvidence(
  origin: PracticeReturnOrigin,
  session: PracticeSession | null,
  report: PracticeReport | null,
) {
  const readyOrigin =
    origin && typeof origin === 'object' && origin.status === 'ready' ? origin : null;
  const learningOrigin = useLearningPracticeOrigin(readyOrigin);
  useEffect(() => {
    if (!session || !report) return;
    persistLearningPracticeEvidence({
      origin: learningOrigin,
      session,
      report,
      storage: browserLearningProgressStorage(),
    });
  }, [learningOrigin, report, session]);
}

function useLearningPracticeOrigin(
  origin: Extract<PracticeReturnOrigin, { status: 'ready' }> | null,
): LearningPracticeOrigin | null {
  const courseSlug = origin?.courseSlug ?? null;
  const topicLabel = origin?.topicLabel ?? null;
  return useMemo(
    () => (courseSlug && topicLabel ? { status: 'ready', courseSlug, topicLabel } : null),
    [courseSlug, topicLabel],
  );
}
