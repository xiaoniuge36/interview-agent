import type {
  InterviewSessionSummary,
  JobIntentPayload,
  MasteryProfile,
  PracticeHistoryItem,
} from '@interview-agent/contracts';

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const DAY_MS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
const WEEK_SPAN = 7;
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const;
const REVIEW_MODES = new Set(['weakness_review', 'interview_review']);

export type DailyTask = {
  id: 'practice' | 'review' | 'learning';
  label: string;
  done: boolean;
  href: string;
};

export type DayActivity = {
  key: string;
  weekday: string;
  active: boolean;
  isToday: boolean;
};

export type TrainingStreak = {
  current: number;
  trainedToday: boolean;
};

/** 本地时区的日历日 key；streak 与任务判定都按用户所在时区的自然日计。 */
export function localDayKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** 按日历日前后移动：交给 Date 构造器规范化，DST 时区下减固定毫秒会跳日或重日。 */
function shiftCalendarDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function collectTrainingDayKeys(
  practices: readonly PracticeHistoryItem[],
  interviews: readonly InterviewSessionSummary[],
): Set<string> {
  const keys = new Set<string>();
  for (const practice of practices)
    keys.add(localDayKey(practice.reportedAt ?? practice.updatedAt));
  for (const interview of interviews) keys.add(localDayKey(interview.updatedAt));
  return keys;
}

/** 今天有训练则从今天连续回数；今天还没练则从昨天回数（今天仍可续上）。 */
export function computeTrainingStreak(days: ReadonlySet<string>, today: Date): TrainingStreak {
  const trainedToday = days.has(localDayKey(today));
  let cursor = trainedToday ? today : shiftCalendarDays(today, -1);
  let current = 0;
  while (days.has(localDayKey(cursor))) {
    current += 1;
    cursor = shiftCalendarDays(cursor, -1);
  }
  return { current, trainedToday };
}

export function recentActivity(days: ReadonlySet<string>, today: Date): DayActivity[] {
  return Array.from({ length: WEEK_SPAN }, (_, index) => {
    const date = shiftCalendarDays(today, -(WEEK_SPAN - 1 - index));
    const key = localDayKey(date);
    return {
      key,
      weekday: WEEKDAY_LABELS[date.getDay()]!,
      active: days.has(key),
      isToday: index === WEEK_SPAN - 1,
    };
  });
}

/** 距目标面试日的自然日差：0=今天，正数=还剩 N 天，负数=已过。 */
export function countdownDays(interviewDate: string | null, today: Date): number | null {
  if (!interviewDate) return null;
  const target = new Date(interviewDate);
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((targetStart.getTime() - todayStart.getTime()) / DAY_MS);
}

/** 取最近更新的、带面试日期的岗位意向；否则回退到最近的 ready 意向。 */
export function pickCountdownIntent(jobs: readonly JobIntentPayload[]): JobIntentPayload | null {
  const active = jobs.filter((job) => job.intent.status !== 'archived');
  const dated = active
    .filter((job) => job.intent.interviewDate)
    .sort((a, b) => b.intent.updatedAt.localeCompare(a.intent.updatedAt));
  if (dated.length) return dated[0]!;
  const ready = active.sort((a, b) => b.intent.updatedAt.localeCompare(a.intent.updatedAt));
  return ready[0] ?? null;
}

/** 掌握度低于该分数的标签视为需要补强的弱项。 */
const WEAK_FOCUS_MAX_SCORE = 70;

export type WeakFocus = {
  tag: string;
  score: number;
  href: string;
};

/** 从掌握度里挑出今天最值得补强的一个弱项：有练习证据、分数最低。 */
export function pickWeakFocus(profiles: readonly MasteryProfile[]): WeakFocus | null {
  const weakest = profiles
    .filter((profile) => profile.evidenceCount > 0 && profile.score < WEAK_FOCUS_MAX_SCORE)
    .sort((left, right) => left.score - right.score || right.evidenceCount - left.evidenceCount)[0];
  if (!weakest) return null;
  return {
    tag: weakest.tag,
    score: Math.round(weakest.score),
    href: `/questions?tags=${encodeURIComponent(weakest.tag)}`,
  };
}

export function buildDailyTasks(input: {
  practices: readonly PracticeHistoryItem[];
  interviews: readonly InterviewSessionSummary[];
  learningUpdatedAt: string | null;
  today: Date;
}): DailyTask[] {
  const todayKey = localDayKey(input.today);
  const practicedToday = input.practices.some(
    (practice) => localDayKey(practice.reportedAt ?? practice.updatedAt) === todayKey,
  );
  const reviewedToday =
    input.interviews.some((interview) => localDayKey(interview.updatedAt) === todayKey) ||
    input.practices.some(
      (practice) =>
        REVIEW_MODES.has(practice.mode) &&
        localDayKey(practice.reportedAt ?? practice.updatedAt) === todayKey,
    );
  const learnedToday =
    input.learningUpdatedAt !== null && localDayKey(input.learningUpdatedAt) === todayKey;
  return [
    { id: 'practice', label: '完成一轮刷题训练', done: practicedToday, href: '/questions' },
    { id: 'review', label: '模拟面试或弱项复练', done: reviewedToday, href: '/interview' },
    { id: 'learning', label: '学习中心学一节课', done: learnedToday, href: '/learn' },
  ];
}
