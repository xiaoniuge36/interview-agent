'use client';

import { useOptionalAuth } from '@interview-agent/auth-client';
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import {
  createLearningProgressSaveQueue,
  learningProgressStateEquals,
  mergeLearningProgress,
  synchronizeLearningProgress,
  toLearningProgressState,
} from '@/lib/learning/learning-progress-sync';
import { getLearningProgress, saveLearningProgress } from '@/lib/learning-progress-api';

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
  const value = useLearningProgressController(courseSlugs, openedCourseSlug);
  return (
    <LearningProgressContext.Provider value={value}>{children}</LearningProgressContext.Provider>
  );
}

function useLearningProgressController(
  courseSlugs: string[],
  openedCourseSlug: string | null,
): LearningProgressContextValue {
  const { state, setState, progressRef, replaceProgress } = useLocalLearningProgressState();
  const enqueueRemote = useLearningProgressCloudSync({
    localReady: state.storageStatus !== 'checking',
    progressRef,
    replaceProgress,
  });

  useEffect(() => {
    const storage = browserLearningProgressStorage();
    const stored = loadLearningProgress(storage, courseSlugs);
    const next = markLearningOpened(stored, openedCourseSlug);
    progressRef.current = next;
    // 非用户直接操作的状态回填走 transition，避免打断进行中的路由导航。
    startTransition(() => {
      setState({
        progress: next,
        storageStatus: persistLearningProgress(next, storage) ? 'persistent' : 'memory-only',
      });
    });
    enqueueRemote(next);
  }, [courseSlugs, enqueueRemote, openedCourseSlug, progressRef, setState]);

  const toggleCompleted = useCallback(
    (slug: string) => {
      const progress = toggleLearningCompletion(progressRef.current, slug);
      replaceProgress(progress);
      enqueueRemote(progress);
    },
    [enqueueRemote, progressRef, replaceProgress],
  );

  return useMemo(
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
}

function useLocalLearningProgressState() {
  const [state, setState] = useState<LearningProgressState>(() => ({
    progress: emptyLearningProgress(),
    storageStatus: 'checking',
  }));
  const progressRef = useRef(state.progress);

  const replaceProgress = useCallback((next: LearningProgress) => {
    progressRef.current = next;
    const stored = persistLearningProgress(next, browserLearningProgressStorage());
    setState({ progress: next, storageStatus: stored ? 'persistent' : 'memory-only' });
  }, []);

  return { state, setState, progressRef, replaceProgress };
}

/** 登录后把本地进度与服务端合并，此后每次变更都以最新状态回写云端。 */
function useLearningProgressCloudSync(options: {
  localReady: boolean;
  progressRef: { current: LearningProgress };
  replaceProgress: (next: LearningProgress) => void;
}) {
  const { localReady, progressRef, replaceProgress } = options;
  const auth = useOptionalAuth();
  const identityKey = auth?.status === 'authenticated' ? (auth.identity?.subject ?? null) : null;
  const syncGenerationRef = useRef(0);
  const writeReadyRef = useRef(false);
  const saveQueueRef = useRef<ReturnType<typeof createLearningProgressSaveQueue> | null>(null);
  saveQueueRef.current ??= createLearningProgressSaveQueue(saveLearningProgress);

  useEffect(() => {
    const generation = syncGenerationRef.current + 1;
    syncGenerationRef.current = generation;
    writeReadyRef.current = false;
    saveQueueRef.current?.reset();
    if (!identityKey || !localReady) return;

    void synchronizeLearningProgress(
      progressRef.current,
      getLearningProgress,
      saveLearningProgress,
    ).then((result) => {
      if (syncGenerationRef.current !== generation) return;
      // 同步期间用户可能已继续操作：再并一次本地最新状态，避免回灌覆盖新进度。
      const merged = mergeLearningProgress(
        progressRef.current,
        toLearningProgressState(result.progress),
      );
      // 云端回填对用户是后台行为，走 transition 以免打断进行中的路由导航。
      startTransition(() => replaceProgress(merged));
      writeReadyRef.current = true;
      if (
        !learningProgressStateEquals(
          toLearningProgressState(merged),
          toLearningProgressState(result.progress),
        )
      ) {
        saveQueueRef.current?.enqueue(merged);
      }
    });

    return () => {
      if (syncGenerationRef.current !== generation) return;
      syncGenerationRef.current += 1;
      writeReadyRef.current = false;
      saveQueueRef.current?.reset();
    };
  }, [identityKey, localReady, progressRef, replaceProgress]);

  return useCallback((progress: LearningProgress) => {
    if (writeReadyRef.current) saveQueueRef.current?.enqueue(progress);
  }, []);
}

export function useLearningProgress(): LearningProgressContextValue {
  const context = useContext(LearningProgressContext);
  if (!context) throw new Error('Learning progress must be used inside its provider.');
  return context;
}
