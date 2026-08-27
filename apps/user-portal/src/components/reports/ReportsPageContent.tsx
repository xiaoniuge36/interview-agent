'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getInterviewReport, listInterviews } from '@/lib/interview-api';
import { listPracticeHistory } from '@/lib/practice-api';
import {
  buildTrainingRecords,
  filterTrainingRecords,
  formatTrainingRecordDate,
  paginateTrainingRecords,
  searchTrainingRecords,
  summarizeTrainingRecords,
  trainingRecordActionLabel,
  trainingRecordStatusLabel,
  type TrainingRecord,
  type TrainingRecordFilter,
  type TrainingRecordPage,
} from './training-records-model';
import { ArchivePagination } from './ArchivePagination';
import { ArchiveEmpty, ArchiveState } from './ArchiveStates';
import {
  ArchiveSectionSwitcher,
  useArchiveSection,
  type ArchiveSectionCounts,
} from './ArchiveSectionSwitcher';
import { TrainingArchiveFilters } from './TrainingArchiveFilters';
import { GrowthOverview } from './GrowthOverview';
import { MistakeBook } from './MistakeBook';
import { StarMaterialLibrary } from './StarMaterialLibrary';
import { TrainingArchiveSummary } from './TrainingArchiveSummary';
import { loadInterviewReportSummaries } from './interview-report-summaries';

const ARCHIVE_LIST_ANCHOR_ID = 'training-archive-list';

type ArchiveState = {
  records: TrainingRecord[];
  status: 'loading' | 'ready' | 'partial' | 'error';
};

/** 训练记录与错题本是两条业务线：拆成互斥分区，避免两块长列表堆叠在一条滚动流里。 */
export function ReportsPageContent() {
  const archive = useTrainingArchive();
  const view = useArchiveNavigation();
  const { section, changeSection } = useArchiveSection();
  const totals = useSectionTotals();
  const records = useMemo(
    () => searchTrainingRecords(filterTrainingRecords(archive.records, view.filter), view.query),
    [archive.records, view.filter, view.query],
  );
  const summary = useMemo(() => summarizeTrainingRecords(records), [records]);
  const counts = useMemo(() => summarizeTrainingRecords(archive.records), [archive.records]);
  const pagination = useMemo(
    () => paginateTrainingRecords(records, view.page),
    [records, view.page],
  );
  const sectionCounts = buildSectionCounts(archive.status, counts.total, totals);

  return (
    <div className="workspace page-workspace training-archive">
      <ArchiveIntro />
      <ArchiveSectionSwitcher section={section} counts={sectionCounts} onChange={changeSection} />
      {/* 两个分区都保持挂载：计数徽标即时可用，筛选与翻页状态在切换后不丢失。 */}
      <div className="training-archive-panel" hidden={section !== 'records'}>
        {archive.status === 'ready' || archive.status === 'partial' ? (
          <GrowthOverview records={archive.records} />
        ) : null}
        <TrainingArchiveFilters
          filter={view.filter}
          query={view.query}
          counts={archive.status === 'loading' ? undefined : counts}
          onChange={view.changeFilter}
          onQueryChange={view.changeQuery}
        />
        <ArchiveDelivery
          state={archive}
          pagination={pagination}
          summary={summary}
          filter={view.filter}
          query={view.query}
          onPage={view.changePage}
        />
      </div>
      <div className="training-archive-panel" hidden={section !== 'mistakes'}>
        <MistakeBook onTotalChange={totals.setMistakeTotal} />
      </div>
      <div className="training-archive-panel" hidden={section !== 'star'}>
        <StarMaterialLibrary onTotalChange={totals.setStarTotal} />
      </div>
    </div>
  );
}

function useSectionTotals() {
  const [mistakeTotal, setMistakeTotal] = useState<number | null>(null);
  const [starTotal, setStarTotal] = useState<number | null>(null);
  return { mistakeTotal, starTotal, setMistakeTotal, setStarTotal };
}

function buildSectionCounts(
  archiveStatus: ArchiveState['status'],
  recordTotal: number,
  totals: ReturnType<typeof useSectionTotals>,
): ArchiveSectionCounts {
  return {
    ...(archiveStatus === 'loading' ? {} : { records: recordTotal }),
    ...(totals.mistakeTotal === null ? {} : { mistakes: totals.mistakeTotal }),
    ...(totals.starTotal === null ? {} : { star: totals.starTotal }),
  };
}

/** 筛选或搜索一旦变化就回到第 1 页；翻页后滚回列表顶部，避免停留在页尾。 */
function useArchiveNavigation() {
  const [filter, setFilter] = useState<TrainingRecordFilter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const changeFilter = useCallback((next: TrainingRecordFilter) => {
    setFilter(next);
    setPage(1);
  }, []);
  const changeQuery = useCallback((next: string) => {
    setQuery(next);
    setPage(1);
  }, []);
  const changePage = useCallback((next: number) => {
    setPage(next);
    document.getElementById(ARCHIVE_LIST_ANCHOR_ID)?.scrollIntoView({ block: 'start' });
  }, []);
  return { filter, query, page, changeFilter, changeQuery, changePage };
}

function useTrainingArchive() {
  const [state, setState] = useState<ArchiveState>({ records: [], status: 'loading' });
  const [request, setRequest] = useState(0);
  const reload = useCallback(() => setRequest((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, status: 'loading' }));
    void loadTrainingArchive().then((archive) => {
      if (active) setState(archive);
    });
    return () => {
      active = false;
    };
  }, [request]);

  return { ...state, reload };
}

async function loadTrainingArchive(): Promise<ArchiveState> {
  const [practices, interviews] = await Promise.allSettled([
    listPracticeHistory(),
    listInterviews(),
  ]);
  const practiceItems = practices.status === 'fulfilled' ? practices.value : [];
  const interviewItems = interviews.status === 'fulfilled' ? interviews.value : [];
  const reports = await loadInterviewReportSummaries(interviewItems, getInterviewReport);
  const successCount =
    Number(practices.status === 'fulfilled') + Number(interviews.status === 'fulfilled');
  return {
    records: buildTrainingRecords(practiceItems, interviewItems, reports.items),
    status: successCount === 2 && !reports.failed ? 'ready' : successCount ? 'partial' : 'error',
  };
}

function ArchiveIntro() {
  return (
    <header className="page-intro training-archive-intro motion-rise">
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
  pagination,
  summary,
  filter,
  query,
  onPage,
}: {
  state: ReturnType<typeof useTrainingArchive>;
  pagination: TrainingRecordPage;
  summary: ReturnType<typeof summarizeTrainingRecords>;
  filter: TrainingRecordFilter;
  query: string;
  onPage: (page: number) => void;
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
  if (!pagination.total) return <ArchiveEmpty filter={filter} query={query} />;
  return (
    <section
      className="training-archive-list motion-stagger"
      id={ARCHIVE_LIST_ANCHOR_ID}
      aria-label="训练记录列表"
    >
      <TrainingArchiveSummary summary={summary} />
      <ArchivePartialNotice state={state} />
      {pagination.items.map((record) => (
        <ArchiveRecord key={`${record.kind}-${record.id}`} record={record} />
      ))}
      <ArchivePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        label="训练记录分页"
        onPage={onPage}
      />
    </section>
  );
}

function ArchivePartialNotice({ state }: { state: ReturnType<typeof useTrainingArchive> }) {
  if (state.status !== 'partial') return null;
  return (
    <p className="training-archive-partial" role="status">
      部分记录暂时未能读取，其余历史已为你保留。
      <button type="button" onClick={state.reload}>
        重新读取
      </button>
    </p>
  );
}

function ArchiveRecord({ record }: { record: TrainingRecord }) {
  return (
    <Link className="training-archive-record motion-lift" href={record.href}>
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
        {record.trend ? <TrainingScoreTrend trend={record.trend} /> : null}
        <em>{trainingRecordActionLabel(record.status)} →</em>
      </span>
    </Link>
  );
}

function TrainingScoreTrend({ trend }: { trend: NonNullable<TrainingRecord['trend']> }) {
  const tone = trend.delta > 0 ? 'up' : trend.delta < 0 ? 'down' : 'steady';
  const visible =
    trend.delta > 0 ? `较上一轮 +${trend.delta}` : `较上一轮 ${trend.delta || '持平'}`;
  return (
    <span
      className="training-archive-record-trend"
      data-tone={tone}
      aria-label={`上一轮 ${Math.round(trend.previousScore)} 分，${visible}`}
    >
      {visible}
    </span>
  );
}

