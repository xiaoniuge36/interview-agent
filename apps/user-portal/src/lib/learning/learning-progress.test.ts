import { describe, expect, it } from 'vitest';
import * as learningProgress from './learning-progress';

const {
  emptyLearningProgress,
  learningProgressSummary,
  markLearningOpened,
  parseLearningProgress,
  persistLearningProgress,
  recordLatestLearningVerification,
  toggleLearningCompletion,
} = learningProgress;

const COURSE_SLUGS = ['course-1', 'course-2', 'course-3'];
const STALE_PROGRESS = JSON.stringify({
  version: 1,
  completedSlugs: ['course-1', 'course-1', 'removed-course'],
  lastOpenedSlug: 'removed-course',
});
const VERIFICATION_PROGRESS = JSON.stringify({
  version: 1,
  completedSlugs: [],
  lastOpenedSlug: null,
  verificationByCourse: {
    'course-1': {
      sessionId: 'session-1',
      topic: 'ReAct',
      score: 86,
      answerCount: 3,
      recordedAt: '2026-07-30T08:00:00.000Z',
    },
    removed: {
      sessionId: 'session-removed',
      topic: 'RAG',
      score: 76,
      answerCount: 2,
      recordedAt: '2026-07-30T08:00:00.000Z',
    },
    'course-2': { sessionId: 'session-2', topic: 'Tool Calling', score: 120 },
  },
});

describe('learning progress parsing', () => {
  registerInvalidProgressTest();
  registerStaleProgressTest();
  registerVerificationRecordParsingTest();
});

function registerInvalidProgressTest() {
  it('falls back to an empty state for invalid or outdated data', () => {
    expect(parseLearningProgress('{broken', COURSE_SLUGS)).toEqual(emptyLearningProgress());
    expect(
      parseLearningProgress(
        JSON.stringify({ version: 0, completedSlugs: ['course-1'], lastOpenedSlug: 'course-1' }),
        COURSE_SLUGS,
      ),
    ).toEqual(emptyLearningProgress());
  });
}

function registerStaleProgressTest() {
  it('deduplicates completed courses and removes stale slugs', () => {
    const progress = parseLearningProgress(STALE_PROGRESS, COURSE_SLUGS);

    expect(progress).toEqual({
      version: 1,
      completedSlugs: ['course-1'],
      lastOpenedSlug: null,
      verificationByCourse: {},
    });
  });
}

function registerVerificationRecordParsingTest() {
  it('keeps only valid local verification records for available courses', () => {
    const progress = parseLearningProgress(VERIFICATION_PROGRESS, COURSE_SLUGS);

    expect(progress.verificationByCourse).toEqual({
      'course-1': {
        sessionId: 'session-1',
        topic: 'ReAct',
        score: 86,
        answerCount: 3,
        recordedAt: '2026-07-30T08:00:00.000Z',
      },
    });
  });
}

describe('learning progress storage', () => {
  it('keeps learning usable when browser storage access fails', () => {
    const load = Reflect.get(learningProgress, 'loadLearningProgress') as
      | ((storage: Storage, courseSlugs: string[]) => ReturnType<typeof emptyLearningProgress>)
      | undefined;
    const unavailableStorage = throwingStorage();

    expect(load).toBeTypeOf('function');
    expect(load?.(unavailableStorage, COURSE_SLUGS)).toEqual(emptyLearningProgress());
    expect(persistLearningProgress(emptyLearningProgress(), unavailableStorage)).toBe(false);
  });

  it('reports whether progress was saved persistently', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    expect(persistLearningProgress(emptyLearningProgress(), storage)).toBe(true);
    expect(persistLearningProgress(emptyLearningProgress(), null)).toBe(false);
  });
});

describe('learning progress transitions', () => {
  registerOpeningTransitionTests();
  registerCompletionTransitionTests();
});

function registerOpeningTransitionTests() {
  it('records the latest opened course without completing it', () => {
    expect(markLearningOpened(emptyLearningProgress(), 'course-2')).toEqual({
      version: 1,
      completedSlugs: [],
      lastOpenedSlug: 'course-2',
      verificationByCourse: {},
    });
  });

  it('preserves the latest course when no course was explicitly opened', () => {
    const existing = markLearningOpened(emptyLearningProgress(), 'course-2');

    expect(markLearningOpened(existing, null)).toEqual(existing);
  });
}

function registerCompletionTransitionTests() {
  it('toggles completion and calculates a rounded percentage', () => {
    const completed = toggleLearningCompletion(emptyLearningProgress(), 'course-1');
    const reopened = toggleLearningCompletion(completed, 'course-1');

    expect(completed.completedSlugs).toEqual(['course-1']);
    expect(reopened.completedSlugs).toEqual([]);
    expect(learningProgressSummary(completed, COURSE_SLUGS)).toEqual({
      completed: 1,
      total: COURSE_SLUGS.length,
      percentage: 33,
    });
  });

  it('keeps manual completion separate while recording only the newest verification', () => {
    const manuallyCompleted = toggleLearningCompletion(emptyLearningProgress(), 'course-1');
    const recorded = recordLatestLearningVerification(manuallyCompleted, 'course-1', {
      sessionId: 'session-newer',
      topic: 'ReAct',
      score: 86,
      answerCount: 3,
      recordedAt: '2026-07-30T08:00:00.000Z',
    });
    const stale = recordLatestLearningVerification(recorded, 'course-1', {
      sessionId: 'session-older',
      topic: 'ReAct',
      score: 71,
      answerCount: 2,
      recordedAt: '2026-07-29T08:00:00.000Z',
    });

    expect(recorded.completedSlugs).toEqual(['course-1']);
    expect(recorded.verificationByCourse['course-1']?.sessionId).toBe('session-newer');
    expect(stale).toEqual(recorded);
  });
}

function throwingStorage(): Storage {
  return {
    getItem: () => {
      throw new Error('storage unavailable');
    },
    setItem: () => {
      throw new Error('storage unavailable');
    },
  } as unknown as Storage;
}
