import { describe, expect, it } from 'vitest';
import type {
  InterviewSessionSummary,
  JobIntentPayload,
  MasteryProfile,
  PracticeHistoryItem,
} from '@interview-agent/contracts';
import {
  buildDailyTasks,
  collectTrainingDayKeys,
  computeTrainingStreak,
  countdownDays,
  localDayKey,
  pickCountdownIntent,
  pickWeakFocus,
  recentActivity,
} from './prep-plan-model';

// 固定“今天”为本地时间中午，避免时区/日界抖动。
const TODAY = new Date(2026, 7, 27, 12, 0, 0);

function isoDaysAgo(days: number, hour = 10): string {
  const date = new Date(2026, 7, 27 - days, hour, 0, 0);
  return date.toISOString();
}

function practice(overrides: Partial<PracticeHistoryItem>): PracticeHistoryItem {
  return {
    id: 'practice-1',
    title: '刷题',
    mode: 'smart',
    status: 'report_ready',
    questionCount: 5,
    answeredCount: 5,
    evaluatedCount: 5,
    overallScore: 80,
    weaknesses: [],
    reportedAt: null,
    updatedAt: isoDaysAgo(0),
    ...overrides,
  };
}

function interview(overrides: Partial<InterviewSessionSummary>): InterviewSessionSummary {
  return {
    id: 'interview-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    jobIntentId: null,
    status: 'report_ready',
    stage: 'hr',
    turnCount: 6,
    createdAt: isoDaysAgo(1),
    updatedAt: isoDaysAgo(1),
    ...overrides,
  } as InterviewSessionSummary;
}

function job(id: string, overrides: Partial<JobIntentPayload['intent']>): JobIntentPayload {
  return {
    intent: {
      id,
      tenantId: 'tenant-1',
      userId: 'user-1',
      targetRole: '后端工程师',
      jdText: 'JD 内容不少于最小长度限制。',
      interviewDate: null,
      status: 'ready',
      createdAt: isoDaysAgo(9),
      updatedAt: isoDaysAgo(2),
      ...overrides,
    },
    profile: null,
  };
}

describe('computeTrainingStreak', () => {
  it('counts consecutive days ending today', () => {
    const days = collectTrainingDayKeys(
      [practice({ updatedAt: isoDaysAgo(0) }), practice({ id: 'p2', updatedAt: isoDaysAgo(1) })],
      [interview({ updatedAt: isoDaysAgo(2) })],
    );
    expect(computeTrainingStreak(days, TODAY)).toEqual({ current: 3, trainedToday: true });
  });

  it('keeps the streak alive when today has no training yet', () => {
    const days = collectTrainingDayKeys(
      [practice({ updatedAt: isoDaysAgo(1) }), practice({ id: 'p2', updatedAt: isoDaysAgo(2) })],
      [],
    );
    expect(computeTrainingStreak(days, TODAY)).toEqual({ current: 2, trainedToday: false });
  });

  it('breaks the streak on a gap day', () => {
    const days = collectTrainingDayKeys([practice({ updatedAt: isoDaysAgo(2) })], []);
    expect(computeTrainingStreak(days, TODAY)).toEqual({ current: 0, trainedToday: false });
  });

  it('prefers reportedAt over updatedAt for practices', () => {
    const days = collectTrainingDayKeys(
      [practice({ reportedAt: isoDaysAgo(0), updatedAt: isoDaysAgo(5) })],
      [],
    );
    expect(days.has(localDayKey(TODAY))).toBe(true);
  });
});

describe('recentActivity', () => {
  it('returns seven days ending today with activity flags', () => {
    const days = new Set([localDayKey(TODAY)]);
    const activity = recentActivity(days, TODAY);
    expect(activity).toHaveLength(7);
    expect(activity.at(-1)).toMatchObject({ active: true, isToday: true });
    expect(activity[0]!.active).toBe(false);
  });

  it('produces seven distinct consecutive calendar keys (DST-safe stepping)', () => {
    // 日历日推进而非减固定 24h：DST 秋季回拨日 25 小时，按毫秒回退会产生重复 key。
    const activity = recentActivity(new Set(), TODAY);
    const keys = activity.map((day) => day.key);
    expect(new Set(keys).size).toBe(7);
    expect(keys.at(-1)).toBe(localDayKey(TODAY));
    expect(keys[0]).toBe('2026-08-21');
  });
});

describe('countdownDays', () => {
  it('returns null without a date and whole-day differences otherwise', () => {
    expect(countdownDays(null, TODAY)).toBeNull();
    expect(countdownDays(new Date(2026, 8, 6, 9).toISOString(), TODAY)).toBe(10);
    expect(countdownDays(new Date(2026, 7, 27, 23).toISOString(), TODAY)).toBe(0);
    expect(countdownDays(new Date(2026, 7, 25, 9).toISOString(), TODAY)).toBe(-2);
  });
});

describe('pickCountdownIntent', () => {
  it('prefers the most recently updated intent that has a date', () => {
    const dated = job('with-date', {
      interviewDate: isoDaysAgo(-5),
      updatedAt: isoDaysAgo(4),
    });
    const fresher = job('no-date', { updatedAt: isoDaysAgo(0) });
    expect(pickCountdownIntent([fresher, dated])?.intent.id).toBe('with-date');
  });

  it('falls back to the freshest active intent and skips archived ones', () => {
    const archived = job('archived', { status: 'archived', updatedAt: isoDaysAgo(0) });
    const active = job('active', { updatedAt: isoDaysAgo(1) });
    expect(pickCountdownIntent([archived, active])?.intent.id).toBe('active');
    expect(pickCountdownIntent([archived])).toBeNull();
  });
});

describe('buildDailyTasks', () => {
  it('marks tasks done from today\u2019s records', () => {
    const tasks = buildDailyTasks({
      practices: [
        practice({ updatedAt: isoDaysAgo(0) }),
        practice({ id: 'p2', mode: 'weakness_review', updatedAt: isoDaysAgo(0) }),
      ],
      interviews: [],
      learningUpdatedAt: isoDaysAgo(0),
      today: TODAY,
    });
    expect(tasks.map((task) => task.done)).toEqual([true, true, true]);
  });

  it('leaves tasks open when the only records are from earlier days', () => {
    const tasks = buildDailyTasks({
      practices: [practice({ updatedAt: isoDaysAgo(1) })],
      interviews: [interview({ updatedAt: isoDaysAgo(3) })],
      learningUpdatedAt: isoDaysAgo(2),
      today: TODAY,
    });
    expect(tasks.map((task) => task.done)).toEqual([false, false, false]);
  });

  it('counts a today interview as the review task', () => {
    const tasks = buildDailyTasks({
      practices: [],
      interviews: [interview({ updatedAt: isoDaysAgo(0) })],
      learningUpdatedAt: null,
      today: TODAY,
    });
    expect(tasks.find((task) => task.id === 'review')?.done).toBe(true);
  });
});

describe('buildDailyTasks field conventions', () => {
  it('uses reportedAt for review-mode practices, consistent with the practice task', () => {
    const tasks = buildDailyTasks({
      practices: [
        practice({
          mode: 'weakness_review',
          reportedAt: isoDaysAgo(0),
          updatedAt: isoDaysAgo(3),
        }),
      ],
      interviews: [],
      learningUpdatedAt: null,
      today: TODAY,
    });
    expect(tasks.find((task) => task.id === 'review')?.done).toBe(true);
  });

  it('links the learning task to the /learn route', () => {
    const tasks = buildDailyTasks({
      practices: [],
      interviews: [],
      learningUpdatedAt: null,
      today: TODAY,
    });
    expect(tasks.find((task) => task.id === 'learning')?.href).toBe('/learn');
  });
});

function mastery(tag: string, score: number, evidenceCount = 3): MasteryProfile {
  return {
    id: `mastery-${tag}`,
    tenantId: 'tenant-1',
    userId: 'user-1',
    tag,
    score,
    evidenceCount,
    lastEvidenceSessionId: null,
    updatedAt: isoDaysAgo(0),
  };
}

describe('pickWeakFocus', () => {
  it('picks the lowest-score weak tag and links to its practice filter', () => {
    const focus = pickWeakFocus([
      mastery('缓存', 62),
      mastery('索引优化', 41),
      mastery('网络', 88),
    ]);
    expect(focus?.tag).toBe('索引优化');
    expect(focus?.score).toBe(41);
    expect(focus?.href).toBe(`/questions?tags=${encodeURIComponent('索引优化')}`);
  });

  it('ignores tags without evidence and returns null when everything is solid', () => {
    expect(pickWeakFocus([mastery('缓存', 30, 0), mastery('网络', 90)])).toBeNull();
    expect(pickWeakFocus([])).toBeNull();
  });

  it('breaks score ties by preferring the tag with more evidence', () => {
    const focus = pickWeakFocus([mastery('缓存', 50, 1), mastery('索引优化', 50, 6)]);
    expect(focus?.tag).toBe('索引优化');
  });
});
