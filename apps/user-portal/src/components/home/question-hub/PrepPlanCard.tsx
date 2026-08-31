'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { JobIntentPayload } from '@interview-agent/contracts';
import { updateJobIntentSchedule } from '@/lib/workspace-api';
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
import { usePrepPlanData, type PrepPlanData } from './use-prep-plan-data';

const SKELETON_PANELS = ['面试倒计时', '今日任务', '连续训练'] as const;

/** 备考计划：面试倒计时 + 今日任务 + 连续训练。数据都来自既有记录，无需用户额外维护。 */
export function PrepPlanCard() {
  const plan = usePrepPlanData();
  if (plan.state.status === 'loading') return <PrepPlanSkeleton />;
  if (plan.state.status === 'error') {
    return <PrepPlanLoadError onRetry={() => void plan.reload()} />;
  }
  return <PrepPlanContent data={plan.state.data} onJobSaved={plan.applyJobUpdate} />;
}

function PrepPlanSkeleton() {
  return (
    <section
      className="prep-plan motion-rise"
      data-state="loading"
      aria-label="备考计划"
      aria-busy="true"
    >
      {SKELETON_PANELS.map((label) => (
        <div key={label} className="prep-plan-skeleton-panel">
          <header>
            <strong>{label}</strong>
            <span>读取中…</span>
          </header>
          <span className="prep-plan-skeleton-bar" data-size="lg" />
          <span className="prep-plan-skeleton-bar" />
          <span className="prep-plan-skeleton-bar" data-size="sm" />
        </div>
      ))}
    </section>
  );
}

export function PrepPlanLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="prep-plan motion-rise" data-state="error" aria-label="备考计划">
      <div className="prep-plan-error" role="status">
        <strong>备考计划暂时没有读取成功</strong>
        <p>面试倒计时、今日任务和连续训练记录都还保存着，重新读取即可恢复。</p>
        <button type="button" onClick={onRetry}>
          重新读取
        </button>
      </div>
    </section>
  );
}

export function PrepPlanContent({
  data,
  onJobSaved,
}: {
  data: PrepPlanData;
  onJobSaved: (job: JobIntentPayload) => void;
}) {
  const today = new Date();
  const days = collectTrainingDayKeys(data.practices, data.interviews);
  const streak = computeTrainingStreak(days, today);
  return (
    <section className="prep-plan motion-rise" aria-label="备考计划">
      <CountdownPanel
        jobs={data.jobs}
        jobsFailed={data.jobsFailed}
        today={today}
        onSaved={onJobSaved}
      />
      <DailyTasksPanel
        tasks={buildDailyTasks({ ...data, today })}
        weakFocus={pickWeakFocus(data.mastery)}
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

function CountdownPanel({
  jobs,
  jobsFailed,
  today,
  onSaved,
}: {
  jobs: JobIntentPayload[];
  jobsFailed: boolean;
  today: Date;
  onSaved: (job: JobIntentPayload) => void;
}) {
  const intent = useMemo(() => pickCountdownIntent(jobs), [jobs]);
  // 拉取失败与「确实没有意向」是两回事：失败时不要误导用户去重新填写。
  if (!intent && jobsFailed) {
    return (
      <div className="prep-plan-countdown" data-state="empty">
        <header>
          <strong>面试倒计时</strong>
        </header>
        <p>岗位意向暂时读取失败，稍后刷新即可恢复。</p>
      </div>
    );
  }
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
  // 用本地日历日回显：ISO 存储是 UTC，直接截取日期段在 UTC+10 以上时区会显示成前一天。
  const initial = intent.intent.interviewDate ? localDayKey(intent.intent.interviewDate) : '';
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
