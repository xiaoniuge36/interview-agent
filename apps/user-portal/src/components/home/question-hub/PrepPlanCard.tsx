'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  InterviewSessionSummary,
  JobIntentPayload,
  MasteryProfile,
  PracticeHistoryItem,
} from '@interview-agent/contracts';
import { getLearningProgress } from '@/lib/learning-progress-api';
import { listInterviews } from '@/lib/interview-api';
import { getMasteryProfiles, listPracticeHistory } from '@/lib/practice-api';
import { listJobIntents, updateJobIntentSchedule } from '@/lib/workspace-api';
import {
  buildDailyTasks,
  collectTrainingDayKeys,
  computeTrainingStreak,
  countdownDays,
  pickCountdownIntent,
  pickWeakFocus,
  recentActivity,
} from './prep-plan-model';

type PrepPlanData = {
  practices: PracticeHistoryItem[];
  interviews: InterviewSessionSummary[];
  jobs: JobIntentPayload[];
  learningUpdatedAt: string | null;
  mastery: MasteryProfile[];
};

/** 备考计划：面试倒计时 + 今日任务 + 连续训练。数据都来自既有记录，无需用户额外维护。 */
export function PrepPlanCard() {
  const plan = usePrepPlanData();
  if (!plan.data) return null;
  const today = new Date();
  const days = collectTrainingDayKeys(plan.data.practices, plan.data.interviews);
  const streak = computeTrainingStreak(days, today);
  return (
    <section className="prep-plan motion-rise" aria-label="备考计划">
      <CountdownPanel jobs={plan.data.jobs} today={today} onSaved={plan.applyJobUpdate} />
      <DailyTasksPanel
        tasks={buildDailyTasks({ ...plan.data, today })}
        weakFocus={pickWeakFocus(plan.data.mastery)}
      />
      <div className="prep-plan-streak">
        <header>
          <strong>连续训练</strong>
          <span>{streak.trainedToday ? '今天已打卡' : '今天还没训练'}</span>
        </header>
        <p className="prep-plan-streak-count">
          <b>{streak.current}</b> 天
        </p>
        <ol className="prep-plan-week" aria-label="最近七天训练记录">
          {recentActivity(days, today).map((day) => (
            <li key={day.key} data-active={day.active} data-today={day.isToday}>
              <i aria-hidden="true" />
              <span>{day.weekday}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function DailyTasksPanel({
  tasks,
  weakFocus,
}: {
  tasks: ReturnType<typeof buildDailyTasks>;
  weakFocus: ReturnType<typeof pickWeakFocus>;
}) {
  return (
    <div className="prep-plan-tasks">
      <header>
        <strong>今日任务</strong>
        <span>
          {tasks.filter((task) => task.done).length}/{tasks.length} 已完成
        </span>
      </header>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} data-done={task.done}>
            <span aria-hidden="true">{task.done ? '✓' : ''}</span>
            {task.done ? <s>{task.label}</s> : <Link href={task.href}>{task.label}</Link>}
          </li>
        ))}
      </ul>
      {weakFocus ? (
        <Link className="prep-plan-focus" href={weakFocus.href}>
          <span>
            重点补强：<b>{weakFocus.tag}</b>
            <small>当前掌握度 {weakFocus.score} 分</small>
          </span>
          <em aria-hidden="true">去练 →</em>
        </Link>
      ) : null}
    </div>
  );
}

function usePrepPlanData() {
  const [data, setData] = useState<PrepPlanData | null>(null);
  useEffect(() => {
    let active = true;
    void loadPrepPlanData().then((result) => {
      if (active && result) setData(result);
    });
    return () => {
      active = false;
    };
  }, []);
  const applyJobUpdate = useCallback((job: JobIntentPayload) => {
    setData((current) =>
      current
        ? {
            ...current,
            jobs: current.jobs.map((item) => (item.intent.id === job.intent.id ? job : item)),
          }
        : current,
    );
  }, []);
  return { data, applyJobUpdate };
}

async function loadPrepPlanData(): Promise<PrepPlanData | null> {
  const [practices, interviews, jobs, learning, mastery] = await Promise.allSettled([
    listPracticeHistory(),
    listInterviews(),
    listJobIntents(),
    getLearningProgress(),
    getMasteryProfiles(),
  ]);
  if (practices.status === 'rejected' && interviews.status === 'rejected') return null;
  return {
    practices: practices.status === 'fulfilled' ? practices.value : [],
    interviews: interviews.status === 'fulfilled' ? interviews.value : [],
    jobs: jobs.status === 'fulfilled' ? jobs.value : [],
    learningUpdatedAt:
      learning.status === 'fulfilled' ? (learning.value.progress?.updatedAt ?? null) : null,
    mastery: mastery.status === 'fulfilled' ? mastery.value : [],
  };
}

function CountdownPanel({
  jobs,
  today,
  onSaved,
}: {
  jobs: JobIntentPayload[];
  today: Date;
  onSaved: (job: JobIntentPayload) => void;
}) {
  const intent = useMemo(() => pickCountdownIntent(jobs), [jobs]);
  if (!intent) {
    return (
      <div className="prep-plan-countdown" data-state="empty">
        <header>
          <strong>面试倒计时</strong>
        </header>
        <p>先在求职意向里录入目标岗位，倒计时会出现在这里。</p>
        <Link className="button secondary" href="/job">
          去填写岗位意向
        </Link>
      </div>
    );
  }
  const remaining = countdownDays(intent.intent.interviewDate, today);
  return (
    <div className="prep-plan-countdown" data-state={remaining === null ? 'unset' : 'set'}>
      <header>
        <strong>面试倒计时</strong>
        <span>{intent.intent.targetRole}</span>
      </header>
      {remaining === null ? null : <CountdownNumber remaining={remaining} />}
      <ScheduleEditor intent={intent} onSaved={onSaved} />
    </div>
  );
}

function CountdownNumber({ remaining }: { remaining: number }) {
  if (remaining < 0) {
    return <p className="prep-plan-countdown-note">面试日已过，更新下一个目标日期继续备战。</p>;
  }
  if (remaining === 0) {
    return (
      <p className="prep-plan-countdown-days" data-tone="today">
        <b>今天</b>就是面试日
      </p>
    );
  }
  return (
    <p className="prep-plan-countdown-days">
      还剩 <b>{remaining}</b> 天
    </p>
  );
}

function ScheduleEditor({
  intent,
  onSaved,
}: {
  intent: JobIntentPayload;
  onSaved: (job: JobIntentPayload) => void;
}) {
  const initial = intent.intent.interviewDate?.slice(0, 'yyyy-mm-dd'.length) ?? '';
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setValue(initial), [initial]);
  const dirty = value !== initial;
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const interviewDate = value ? new Date(`${value}T09:00:00`).toISOString() : null;
      onSaved(await updateJobIntentSchedule(intent.intent.id, { interviewDate }));
    } catch {
      setError('保存失败，请稍后重试。');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="prep-plan-schedule">
      <label>
        <span>{intent.intent.interviewDate ? '调整面试日期' : '设置面试日期'}</span>
        <input
          type="date"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="目标面试日期"
        />
      </label>
      {dirty ? (
        <button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? '保存中…' : '保存'}
        </button>
      ) : null}
      {error ? <em role="status">{error}</em> : null}
    </div>
  );
}
