'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  browserLearningProgressStorage,
  emptyLearningProgress,
  learningProgressSummary,
  loadLearningProgress,
  markLearningOpened,
  persistLearningProgress,
  toggleLearningCompletion,
  type LearningProgress,
  type LearningProgressSummary,
} from '@/lib/learning/learning-progress';

type LearningProgressContextValue = {
  progress: LearningProgress;
  summary: LearningProgressSummary;
  storageStatus: LearningStorageStatus;
  isCompleted: (slug: string) => boolean;
  latestVerificationFor: (slug: string) => LearningProgress['verificationByCourse'][string] | null;
  toggleCompleted: (slug: string) => void;
};

export type LearningStorageStatus = 'checking' | 'persistent' | 'memory-only';

type LearningProgressState = {
  progress: LearningProgress;
  storageStatus: LearningStorageStatus;
};

const LearningProgressContext = createContext<LearningProgressContextValue | null>(null);

export function LearningProgressProvider({
  courseSlugs,
  openedCourseSlug,
  children,
}: {
  courseSlugs: string[];
  openedCourseSlug: string | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<LearningProgressState>(() => ({
    progress: emptyLearningProgress(),
    storageStatus: 'checking',
  }));

  useEffect(() => {
    const storage = browserLearningProgressStorage();
    const stored = loadLearningProgress(storage, courseSlugs);
    const next = markLearningOpened(stored, openedCourseSlug);
    setState({
      progress: next,
      storageStatus: persistLearningProgress(next, storage) ? 'persistent' : 'memory-only',
    });
  }, [courseSlugs, openedCourseSlug]);

  const toggleCompleted = useCallback((slug: string) => {
    setState((current) => {
      const progress = toggleLearningCompletion(current.progress, slug);
      const stored = persistLearningProgress(progress, browserLearningProgressStorage());
      return { progress, storageStatus: stored ? 'persistent' : 'memory-only' };
    });
  }, []);

  const value = useMemo(
    () => ({
      progress: state.progress,
      summary: learningProgressSummary(state.progress, courseSlugs),
      storageStatus: state.storageStatus,
      isCompleted: (slug: string) => state.progress.completedSlugs.includes(slug),
      latestVerificationFor: (slug: string) => state.progress.verificationByCourse[slug] ?? null,
      toggleCompleted,
    }),
    [courseSlugs, state, toggleCompleted],
  );

  return (
    <LearningProgressContext.Provider value={value}>{children}</LearningProgressContext.Provider>
  );
}

export function useLearningProgress(): LearningProgressContextValue {
  const context = useContext(LearningProgressContext);
  if (!context) throw new Error('Learning progress must be used inside its provider.');
  return context;
}
