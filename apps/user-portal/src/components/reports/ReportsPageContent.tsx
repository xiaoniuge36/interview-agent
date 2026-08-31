'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getInterviewReport, listInterviews } from '@/lib/interview-api';
import { listPracticeHistory } from '@/lib/practice-api';
import {
  buildTrainingRecords,
  filterTrainingRecords,
  paginateTrainingRecords,
  searchTrainingRecords,
  summarizeTrainingRecords,
  type TrainingRecord,
  type TrainingRecordFilter,
  type TrainingRecordPage,
} from './training-records-model';
import { ArchiveRecord } from './ArchiveRecordRow';
import { ArchivePagination } from './ArchivePagination';
import { ArchiveEmpty, ArchiveState } from './ArchiveStates';
import {
  ArchiveSectionSwitcher,
  useArchiveSection,
  type ArchiveSection,
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

export type ArchiveLoadPhase = 'initial-loading' | 'refreshing' | 'error' | 'ready';

/** 重新读取时已有旧记录则保留列表进入刷新态，仅首载才整块换成加载占位。 */
export function archiveLoadPhase(
  status: ArchiveState['status'],
  recordCount: number,
): ArchiveLoadPhase {
  if (status === 'loading') return recordCount ? 'refreshing' : 'initial-loading';
  if (status === 'error') return 'error';
  return 'ready';
}

/** 训练记录与错题本是两条业务线：拆成互斥分区，避免两块长列表堆叠在一条滚动流里。 */
export function ReportsPageContent() {
  const archive = useTrainingArchive();
  const view = useArchiveNavigation();
  const { section, changeSection } = useArchiveSection();
  // 分区首次激活才挂载（进页不再预打错题本/STAR 接口）；访问过后保持挂载，切换不丢筛选与翻页状态。
  const visitedSections = useRef(new Set<ArchiveSection>());
  visitedSections.current.add(section);
  const totals = useSectionTotals();
  const counts = useMemo(() => summarizeTrainingRecords(archive.records), [archive.records]);
  const sectionCounts = buildSectionCounts(archive.status, counts.total, totals);

  return (
    <div className="workspace page-workspace training-archive">
      <ArchiveIntro />
      <ArchiveSectionSwitcher section={section} counts={sectionCounts} onChange={changeSection} />
      {/* 计数徽标在分区首次访问后出现；用 hidden 而非卸载保证已访问分区的状态留存。 */}
      <div className="training-archive-panel" hidden={section !== 'records'}>
        <ArchiveRecordsPanel archive={archive} view={view} counts={counts} />
      </div>
      <ArchiveSidePanels section={section} visited={visitedSections.current} totals={totals} />
    </div>
  );
}

function ArchiveRecordsPanel({
  archive,
  view,
  counts,
}: {
  archive: ReturnType<typeof useTrainingArchive>;
  view: ReturnType<typeof useArchiveNavigation>;
  counts: ReturnType<typeof summarizeTrainingRecords>;
}) {
  const phase = archiveLoadPhase(archive.status, archive.records.length);
  const records = useMemo(
    () => searchTrainingRecords(filterTrainingRecords(archive.records, view.filter), view.query),
    [archive.records, view.filter, view.query],
  );
  const summary = useMemo(() => summarizeTrainingRecords(records), [records]);
  const pagination = useMemo(
    () => paginateTrainingRecords(records, view.page),
    [records, view.page],
  );
  return (
    <>
      {phase === 'ready' || phase === 'refreshing' ? (
        <GrowthOverview records={archive.records} />
      ) : null}
      <TrainingArchiveFilters
        filter={view.filter}
        query={view.query}
        counts={phase === 'initial-loading' ? undefined : counts}
        onChange={view.changeFilter}
        onQueryChange={view.changeQuery}
      />
      <ArchiveDelivery
        state={archive}
        phase={phase}
        pagination={pagination}
        summary={summary}
        filter={view.filter}
        query={view.query}
        onPage={view.changePage}
        onClearQuery={view.clearQuery}
      />
    </>
  );
}

/** 错题本与 STAR 素材分区：首次访问才挂载，之后仅用 hidden 隐藏以保留分页与排序状态。 */
function ArchiveSidePanels({
  section,
  visited,
  totals,
}: {
  section: ArchiveSection;
  visited: ReadonlySet<ArchiveSection>;
  totals: ReturnType<typeof useSectionTotals>;
}) {
  return (
    <>
      <div className="training-archive-panel" hidden={section !== 'mistakes'}>
        {visited.has('mistakes') ? <MistakeBook onTotalChange={totals.setMistakeTotal} /> : null}
      </div>
      <div className="training-archive-panel" hidden={section !== 'star'}>
        {visited.has('star') ? <StarMaterialLibrary onTotalChange={totals.setStarTotal} /> : null}
      </div>
    </>
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
  const clearQuery = useCallback(() => changeQuery(''), [changeQuery]);
  const changePage = useCallback((next: number) => {
    setPage(next);
    document.getElementById(ARCHIVE_LIST_ANCHOR_ID)?.scrollIntoView({ block: 'start' });
  }, []);
  return { filter, query, page, changeFilter, changeQuery, clearQuery, changePage };
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
        <h1 className="h2">复盘中心</h1>
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

type ArchiveDeliveryProps = {
  state: ReturnType<typeof useTrainingArchive>;
  phase: ArchiveLoadPhase;
  pagination: TrainingRecordPage;
  summary: ReturnType<typeof summarizeTrainingRecords>;
  filter: TrainingRecordFilter;
  query: string;
  onPage: (page: number) => void;
  onClearQuery: () => void;
};

function ArchiveDelivery({ state, phase, pagination, ...props }: ArchiveDeliveryProps) {
  if (phase === 'initial-loading')
    return <ArchiveState title="正在整理训练记录" copy="刷题和面试记录正在同步。" />;
  if (phase === 'error') {
    return (
      <ArchiveState
        title="复盘中心暂时无法读取"
        copy="已保存的训练不会丢失，请稍后重试。"
        onRetry={state.reload}
      />
    );
  }
  if (!pagination.total) {
    return (
      <ArchiveEmpty filter={props.filter} query={props.query} onClearQuery={props.onClearQuery} />
    );
  }
  return (
    <section
      className="training-archive-list motion-stagger"
      id={ARCHIVE_LIST_ANCHOR_ID}
      aria-label="训练记录列表"
      aria-busy={phase === 'refreshing'}
    >
      <TrainingArchiveSummary summary={props.summary} />
      <ArchivePartialNotice state={state} />
      {pagination.items.map((record) => (
        <ArchiveRecord key={`${record.kind}-${record.id}`} record={record} />
      ))}
      <ArchivePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        label="训练记录分页"
        onPage={props.onPage}
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
