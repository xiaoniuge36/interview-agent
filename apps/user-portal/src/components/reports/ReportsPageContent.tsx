'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listInterviews } from '@/lib/interview-api';
import { listPracticeHistory } from '@/lib/practice-api';
import {
  buildTrainingRecords,
  filterTrainingRecords,
  formatTrainingRecordDate,
  searchTrainingRecords,
  summarizeTrainingRecords,
  trainingRecordStatusLabel,
  type TrainingRecord,
  type TrainingRecordFilter,
} from './training-records-model';
import { TrainingArchiveFilters } from './TrainingArchiveFilters';
import { WeaknessReviewAction } from './WeaknessReviewAction';

type ArchiveState = {
  records: TrainingRecord[];
  status: 'loading' | 'ready' | 'partial' | 'error';
};

export function ReportsPageContent() {
  const [filter, setFilter] = useState<TrainingRecordFilter>('all');
  const [query, setQuery] = useState('');
  const archive = useTrainingArchive();
  const records = useMemo(
    () => searchTrainingRecords(filterTrainingRecords(archive.records, filter), query),
    [archive.records, filter, query],
  );
  const summary = useMemo(() => summarizeTrainingRecords(records), [records]);

  return (
    <div className="workspace page-workspace training-archive">
      <ArchiveIntro />
      <TrainingArchiveFilters
        filter={filter}
        query={query}
        onChange={setFilter}
        onQueryChange={setQuery}
      />
      <ArchiveDelivery
        state={archive}
        records={records}
        summary={summary}
        filter={filter}
        query={query}
      />
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

function ArchiveDelivery({
  state,
  records,
  summary,
  filter,
  query,
}: {
  state: ReturnType<typeof useTrainingArchive>;
  records: TrainingRecord[];
  summary: ReturnType<typeof summarizeTrainingRecords>;
  filter: TrainingRecordFilter;
  query: string;
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
  if (!records.length) return <ArchiveEmpty filter={filter} query={query} />;
  return (
    <section className="training-archive-list" aria-label="训练记录列表">
      <ArchiveSummary summary={summary} />
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

export function ArchiveSummary({
  summary,
}: {
  summary: ReturnType<typeof summarizeTrainingRecords>;
}) {
  return (
    <section className="training-archive-summary" aria-label="训练概览">
      <div>
        <span>训练证据</span>
        <strong>{summary.total} 条记录已沉淀</strong>
        <p>从真实的复盘出发，选择下一轮训练。</p>
        {summary.practice ? <WeaknessReviewAction /> : null}
      </div>
      <dl>
        <SummaryFact label="刷题" value={summary.practice} />
        <SummaryFact label="模拟面试" value={summary.interview} />
        <SummaryFact label="已完成复盘" value={summary.reviewed} />
      </dl>
    </section>
  );
}

function SummaryFact({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
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
          {record.kind === 'practice' ? '刷题复盘' : '模拟面试'} ·{' '}
          {formatTrainingRecordDate(record.updatedAt)}
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
        <small>
          {record.score !== null ? 'AI 复盘得分' : trainingRecordStatusLabel(record.status)}
        </small>
        <em>查看记录 →</em>
      </span>
    </Link>
  );
}

function ArchiveEmpty({ filter, query }: { filter: TrainingRecordFilter; query: string }) {
  const search = query.trim();
  const copy = search
    ? `没有找到包含“${search}”的训练记录。试试标题、类型、状态或薄弱项。`
    : filter === 'interview'
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
