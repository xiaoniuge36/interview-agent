export const LEARNING_PROGRESS_STORAGE_KEY = 'interview-agent:learning-progress:v1';
const LEARNING_PROGRESS_VERSION = 1;
const PERCENT_MULTIPLIER = 100;
const MAX_LOCAL_TEXT_LENGTH = 160;

export type LearningProgress = {
  version: typeof LEARNING_PROGRESS_VERSION;
  completedSlugs: string[];
  lastOpenedSlug: string | null;
  verificationByCourse: Record<string, LocalLearningVerification>;
};

export type LocalLearningVerification = {
  sessionId: string;
  topic: string;
  score: number | null;
  answerCount: number;
  recordedAt: string;
};

export type LearningProgressSummary = {
  completed: number;
  total: number;
  percentage: number;
};

export type LearningProgressStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function emptyLearningProgress(): LearningProgress {
  return {
    version: LEARNING_PROGRESS_VERSION,
    completedSlugs: [],
    lastOpenedSlug: null,
    verificationByCourse: {},
  };
}

export function parseLearningProgress(
  serialized: string | null,
  availableSlugs: readonly string[],
): LearningProgress {
  if (!serialized) return emptyLearningProgress();
  try {
    const value = JSON.parse(serialized) as unknown;
    if (!isProgressRecord(value) || value.version !== LEARNING_PROGRESS_VERSION) {
      return emptyLearningProgress();
    }
    const available = new Set(availableSlugs);
    const completedSlugs = [...new Set(value.completedSlugs)].filter((slug) => available.has(slug));
    return {
      version: LEARNING_PROGRESS_VERSION,
      completedSlugs,
      lastOpenedSlug:
        typeof value.lastOpenedSlug === 'string' && available.has(value.lastOpenedSlug)
          ? value.lastOpenedSlug
          : null,
      verificationByCourse: parseLocalVerifications(value.verificationByCourse, available),
    };
  } catch {
    return emptyLearningProgress();
  }
}

export function loadLearningProgress(
  storage: LearningProgressStorage | null,
  availableSlugs: readonly string[],
): LearningProgress {
  try {
    return parseLearningProgress(
      storage?.getItem(LEARNING_PROGRESS_STORAGE_KEY) ?? null,
      availableSlugs,
    );
  } catch {
    return emptyLearningProgress();
  }
}

export function persistLearningProgress(
  progress: LearningProgress,
  storage: LearningProgressStorage | null,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(LEARNING_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    // 浏览器禁用存储时保留内存进度，避免阻断学习。
    return false;
  }
}

export function browserLearningProgressStorage(): LearningProgressStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function markLearningOpened(
  progress: LearningProgress,
  courseSlug: string | null,
): LearningProgress {
  if (!courseSlug) return progress;
  return { ...progress, lastOpenedSlug: courseSlug };
}

export function toggleLearningCompletion(
  progress: LearningProgress,
  courseSlug: string,
): LearningProgress {
  const completed = new Set(progress.completedSlugs);
  if (completed.has(courseSlug)) completed.delete(courseSlug);
  else completed.add(courseSlug);
  return { ...progress, completedSlugs: [...completed] };
}

export function recordLatestLearningVerification(
  progress: LearningProgress,
  courseSlug: string,
  verification: LocalLearningVerification,
): LearningProgress {
  const current = progress.verificationByCourse[courseSlug];
  if (current && current.recordedAt >= verification.recordedAt) return progress;
  return {
    ...progress,
    verificationByCourse: { ...progress.verificationByCourse, [courseSlug]: verification },
  };
}

export function persistLatestLearningVerification(
  storage: LearningProgressStorage | null,
  courseSlug: string,
  verification: LocalLearningVerification,
): boolean {
  if (!storage || !isLocalVerification(verification) || !isStorageCourseSlug(courseSlug))
    return false;
  const progress = loadUnfilteredLearningProgress(storage);
  const next = recordLatestLearningVerification(progress, courseSlug, verification);
  return next === progress || persistLearningProgress(next, storage);
}

export function learningProgressSummary(
  progress: LearningProgress,
  courseSlugs: readonly string[],
): LearningProgressSummary {
  const courses = new Set(courseSlugs);
  const completed = progress.completedSlugs.filter((slug) => courses.has(slug)).length;
  const total = courseSlugs.length;
  return {
    completed,
    total,
    percentage: total ? Math.round((completed / total) * PERCENT_MULTIPLIER) : 0,
  };
}

function isProgressRecord(value: unknown): value is {
  version: number;
  completedSlugs: string[];
  lastOpenedSlug?: unknown;
  verificationByCourse?: unknown;
} {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.version === 'number' &&
    Array.isArray(record.completedSlugs) &&
    record.completedSlugs.every((slug) => typeof slug === 'string')
  );
}

function loadUnfilteredLearningProgress(storage: LearningProgressStorage): LearningProgress {
  try {
    return parseStoredLearningProgress(storage.getItem(LEARNING_PROGRESS_STORAGE_KEY));
  } catch {
    return emptyLearningProgress();
  }
}

function parseStoredLearningProgress(serialized: string | null): LearningProgress {
  if (!serialized) return emptyLearningProgress();
  try {
    const value = JSON.parse(serialized) as unknown;
    if (!isProgressRecord(value) || value.version !== LEARNING_PROGRESS_VERSION) {
      return emptyLearningProgress();
    }
    return {
      version: LEARNING_PROGRESS_VERSION,
      completedSlugs: [...new Set(value.completedSlugs)],
      lastOpenedSlug: typeof value.lastOpenedSlug === 'string' ? value.lastOpenedSlug : null,
      verificationByCourse: parseLocalVerifications(value.verificationByCourse),
    };
  } catch {
    return emptyLearningProgress();
  }
}

function parseLocalVerifications(value: unknown, available?: Set<string>) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const verifications: Record<string, LocalLearningVerification> = {};
  for (const [courseSlug, verification] of Object.entries(value)) {
    if ((!available || available.has(courseSlug)) && isStorageCourseSlug(courseSlug)) {
      if (isLocalVerification(verification)) verifications[courseSlug] = verification;
    }
  }
  return verifications;
}

function isLocalVerification(value: unknown): value is LocalLearningVerification {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    isShortText(record.sessionId) &&
    isShortText(record.topic) &&
    (record.score === null || isScore(record.score)) &&
    Number.isSafeInteger(record.answerCount) &&
    (record.answerCount as number) >= 0 &&
    typeof record.recordedAt === 'string' &&
    !Number.isNaN(Date.parse(record.recordedAt))
  );
}

function isStorageCourseSlug(value: string) {
  return isShortText(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
}

function isShortText(value: unknown) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_LOCAL_TEXT_LENGTH;
}

function isScore(value: unknown) {
  return (
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= PERCENT_MULTIPLIER
  );
}
