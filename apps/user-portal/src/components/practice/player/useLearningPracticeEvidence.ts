'use client';

import { useEffect, useMemo } from 'react';
import type { PracticeReport, PracticeSession } from '@interview-agent/contracts';
import {
  browserLearningProgressStorage,
  loadStoredLearningProgress,
} from '@/lib/learning/learning-progress';
import { synchronizeLearningProgress } from '@/lib/learning/learning-progress-sync';
import { getLearningProgress, saveLearningProgress } from '@/lib/learning-progress-api';
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
    const storage = browserLearningProgressStorage();
    const stored = persistLearningPracticeEvidence({
      origin: learningOrigin,
      session,
      report,
      storage,
    });
    if (!stored) return;
    // 验证证据是跨设备的关键信号，本地落盘后立刻与云端合并回写。
    void synchronizeLearningProgress(
      loadStoredLearningProgress(storage),
      getLearningProgress,
      saveLearningProgress,
    );
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
