import type {
  LearningProgressState,
  UserLearningProgressPayload,
} from '@interview-agent/contracts';
import {
  emptyLearningProgress,
  type LearningProgress,
  type LocalLearningVerification,
} from './learning-progress';

const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export type LearningProgressSyncSource = 'in-sync' | 'uploaded' | 'local-only';

export type LearningProgressSyncResult = {
  progress: LearningProgress;
  source: LearningProgressSyncSource;
};

type ProgressReader = () => Promise<UserLearningProgressPayload>;
type ProgressWriter = (state: LearningProgressState) => Promise<unknown>;

export function toLearningProgressState(progress: LearningProgress): LearningProgressState {
  return {
    completedSlugs: progress.completedSlugs,
    lastOpenedSlug: progress.lastOpenedSlug,
    verificationByCourse: progress.verificationByCourse,
  };
}

export function learningProgressFromState(state: LearningProgressState): LearningProgress {
  return {
    ...emptyLearningProgress(),
    completedSlugs: [...new Set(state.completedSlugs)],
    lastOpenedSlug: state.lastOpenedSlug,
    verificationByCourse: sanitizeVerifications(state.verificationByCourse),
  };
}

/** 双端进度合并：完成课程取并集，验证记录按时间新者胜，本地打开记录优先。 */
export function mergeLearningProgress(
  local: LearningProgress,
  remote: LearningProgressState,
): LearningProgress {
  const merged = learningProgressFromState(remote);
  merged.completedSlugs = [...new Set([...merged.completedSlugs, ...local.completedSlugs])];
  merged.lastOpenedSlug = local.lastOpenedSlug ?? merged.lastOpenedSlug;
  for (const [slug, verification] of Object.entries(local.verificationByCourse)) {
    const remoteVerification = merged.verificationByCourse[slug];
    if (!remoteVerification || remoteVerification.recordedAt < verification.recordedAt) {
      merged.verificationByCourse[slug] = verification;
    }
  }
  return merged;
}

export function learningProgressStateEquals(
  a: LearningProgressState,
  b: LearningProgressState,
): boolean {
  return canonicalState(a) === canonicalState(b);
}

export async function synchronizeLearningProgress(
  local: LearningProgress,
  read: ProgressReader,
  write: ProgressWriter,
): Promise<LearningProgressSyncResult> {
  try {
    const remote = (await read()).progress;
    if (!remote) return uploadWhenMeaningful(local, write);
    const merged = mergeLearningProgress(local, remote);
    if (learningProgressStateEquals(toLearningProgressState(merged), remote)) {
      return { progress: merged, source: 'in-sync' };
    }
    return upload(merged, write);
  } catch {
    return { progress: local, source: 'local-only' };
  }
}

export function createLearningProgressSaveQueue(save: ProgressWriter) {
  let generation = 0;
  let pending: LearningProgressState | null = null;
  let running: Promise<void> | null = null;

  function start() {
    if (running) return;
    const runGeneration = generation;
    const completion = drain(runGeneration).finally(() => {
      if (running === completion) running = null;
      if (generation === runGeneration && pending) start();
    });
    running = completion;
  }

  async function drain(runGeneration: number) {
    while (generation === runGeneration && pending) {
      const next = pending;
      pending = null;
      try {
        await save(next);
      } catch {
        if (generation !== runGeneration || !pending) return;
      }
    }
  }

  return {
    enqueue(progress: LearningProgress) {
      pending = toLearningProgressState(progress);
      start();
    },
    reset() {
      generation += 1;
      pending = null;
      running = null;
    },
    idle() {
      return running ?? Promise.resolve();
    },
  };
}

function isEmptyProgress(progress: LearningProgress) {
  return (
    progress.completedSlugs.length === 0 &&
    progress.lastOpenedSlug === null &&
    Object.keys(progress.verificationByCourse).length === 0
  );
}

async function uploadWhenMeaningful(
  local: LearningProgress,
  write: ProgressWriter,
): Promise<LearningProgressSyncResult> {
  if (isEmptyProgress(local)) return { progress: local, source: 'in-sync' };
  return upload(local, write);
}

async function upload(
  progress: LearningProgress,
  write: ProgressWriter,
): Promise<LearningProgressSyncResult> {
  try {
    await write(toLearningProgressState(progress));
    return { progress, source: 'uploaded' };
  } catch {
    return { progress, source: 'local-only' };
  }
}

function sanitizeVerifications(value: Record<string, LocalLearningVerification>) {
  const verifications: Record<string, LocalLearningVerification> = {};
  for (const [slug, verification] of Object.entries(value)) {
    if (!RESERVED_KEYS.has(slug)) verifications[slug] = verification;
  }
  return verifications;
}

function canonicalState(state: LearningProgressState): string {
  return JSON.stringify({
    completedSlugs: [...state.completedSlugs].sort(),
    lastOpenedSlug: state.lastOpenedSlug,
    verificationByCourse: Object.fromEntries(
      Object.entries(state.verificationByCourse).sort(([a], [b]) => a.localeCompare(b)),
    ),
  });
}
