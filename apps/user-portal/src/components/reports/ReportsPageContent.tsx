'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listInterviews } from '@/lib/interview-api';
import { listPracticeHistory } from '@/lib/practice-api';
import {
  buildTrainingRecords,
  filterTrainingRecords,
  type TrainingRecord,
  type TrainingRecordFilter,
} from './training-records-model';

const FILTERS: Array<{ id: TrainingRecordFilter; label: string }> = [
  { id: 'all', label: '全部记录' },
  { id: 'practice', label: '刷题复盘' },
  { id: 'interview', label: '模拟面试' },
];

type ArchiveState = {
  records: TrainingRecord[];
  status: 'loading' | 'ready' | 'partial' | 'error';
};

export function ReportsPageContent() {
  const [filter, setFilter] = useState<TrainingRecordFilter>('all');
  const archive = useTrainingArchive();
  const records = useMemo(
    () => filterTrainingRecords(archive.records, filter),
    [archive.records, filter],
  );

  return (
    <div className="workspace page-workspace training-archive">
      <ArchiveIntro />
      <ArchiveFilters filter={filter} onChange={setFilter} />
      <ArchiveDelivery state={archive} records={records} filter={filter} />
    </div>
  );
}

function useTrainingArchive() {
  const [state, setState] = useState<ArchiveState>({ records: [], status: 'loading' });
  const [request, setRequest] = useState(0);
  const reload = useCallback(() => setRequest((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, status: 'loading' }));
    void Promise.allSettled([listPracticeHistory(), listInterviews()]).then(
      ([practices, interviews]) => {
        if (!active) return;
        const practiceItems = practices.status === 'fulfilled' ? practices.value : [];
        const interviewItems = interviews.status === 'fulfilled' ? interviews.value : [];
        const successCount =
          Number(practices.status === 'fulfilled') + Number(interviews.status === 'fulfilled');
        setState({
          records: buildTrainingRecords(practiceItems, interviewItems),
          status: successCount === 2 ? 'ready' : successCount ? 'partial' : 'error',
        });
      },
    );
    return () => {
      active = false;
    };
  }, [request]);

  return { ...state, reload };
}

function ArchiveIntro() {
  return (
    <header className="page-intro training-archive-intro">
      <div>
        <div className="eyebrow">训练证据 · 回看与再练</div>
        <h1 className="h2">训练档案</h1>
        <p className="muted-text">
          把每一轮刷题和模拟面试沉淀为可回看的证据。优先从薄弱点出发，再开下一轮训练。
        </p>
      </div>
      <div className="training-archive-intro-actions">
        <Link className="button secondary" href="/questions">
          去刷题
        </Link>
        <Link className="button" href="/interview">
          开始模拟面试
        </Link>
      </div>
    </header>
  );
}

function ArchiveFilters({
  filter,
  onChange,
}: {
  filter: TrainingRecordFilter;
  onChange: (filter: TrainingRecordFilter) => void;
}) {
  return (
    <div className="training-archive-filters" aria-label="筛选训练记录">
      {FILTERS.map((item) => (
        <button
          className={filter === item.id ? 'active' : ''}
          key={item.id}
          type="button"
          aria-pressed={filter === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ArchiveDelivery({
  state,
  records,
  filter,
}: {
  state: ReturnType<typeof useTrainingArchive>;
  records: TrainingRecord[];
  filter: TrainingRecordFilter;
}) {
  if (state.status === 'loading')
    return <ArchiveState title="正在整理训练记录" copy="刷题和面试记录正在同步。" />;
  if (state.status === 'error') {
    return (
      <ArchiveState
        title="训练档案暂时无法读取"
        copy="已保存的训练不会丢失，请稍后重试。"
        onRetry={state.reload}
      />
    );
  }
  if (!records.length) return <ArchiveEmpty filter={filter} />;
  return (
    <section className="training-archive-list" aria-label="训练记录列表">
      {state.status === 'partial' ? (
        <p className="training-archive-partial" role="status">
          部分记录暂时未能读取，其余历史已为你保留。
          <button type="button" onClick={state.reload}>
            重新读取
          </button>
        </p>
      ) : null}
      {records.map((record) => (
        <ArchiveRecord key={`${record.kind}-${record.id}`} record={record} />
      ))}
    </section>
  );
}

function ArchiveRecord({ record }: { record: TrainingRecord }) {
  return (
    <Link className="training-archive-record" href={record.href}>
      <span className="training-archive-record-mark" data-kind={record.kind} aria-hidden="true">
        {record.kind === 'practice' ? '题' : '面'}
      </span>
      <span className="training-archive-record-main">
        <small>
          {record.kind === 'practice' ? '刷题复盘' : '模拟面试'} · {formatDate(record.updatedAt)}
        </small>
        <strong>{record.title}</strong>
        <span className="training-archive-record-facts">{record.facts.join(' · ')}</span>
        {record.signals.length ? (
          <span className="training-archive-record-signals">
            {record.signals.map((signal) => (
              <i key={signal}>{signal}</i>
            ))}
          </span>
        ) : null}
      </span>
      <span className="training-archive-record-result">
        {record.score !== null ? <b>{Math.round(record.score)}</b> : null}
        <small>{record.score !== null ? 'AI 复盘得分' : recordStatusLabel(record.status)}</small>
        <em>查看记录 →</em>
      </span>
    </Link>
  );
}

function ArchiveEmpty({ filter }: { filter: TrainingRecordFilter }) {
  const copy =
    filter === 'interview'
      ? '还没有模拟面试记录。开始一场面试，让反馈沉淀下来。'
      : filter === 'practice'
        ? '还没有刷题复盘。完成一轮题单后，这里会标出可补强的要点。'
        : '还没有训练记录。选一道题或开始一次模拟面试，第一份复盘会出现在这里。';
  return (
    <section className="training-archive-empty">
      <span>训练从第一条证据开始</span>
      <h2>这里会成为你的错题本</h2>
      <p>{copy}</p>
      <Link className="button" href={filter === 'interview' ? '/interview' : '/questions'}>
        {filter === 'interview' ? '开始模拟面试' : '去选择题目'}
      </Link>
    </section>
  );
}

function ArchiveState({
  title,
  copy,
  onRetry,
}: {
  title: string;
  copy: string;
  onRetry?: () => void;
}) {
  return (
    <section className="training-archive-empty" aria-live="polite">
      <span>训练档案</span>
      <h2>{title}</h2>
      <p>{copy}</p>
      {onRetry ? (
        <button className="button" type="button" onClick={onRetry}>
          重新读取
        </button>
      ) : null}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(
    new Date(value),
  );
}

function recordStatusLabel(status: string) {
  if (status === 'report_ready') return '复盘已完成';
  if (status === 'in_progress' || status === 'waiting_user') return '进行中';
  if (status === 'submitted' || status === 'generating_report') return '报告生成中';
  return '已保存';
}
