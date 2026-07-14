import type { CandidateReview } from '@interview-agent/contracts';
import { useDeferredValue, useMemo, useState } from 'react';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { filterCandidates, paginateRecords } from './admin-records';
import { SectionFeedback } from './SectionState';

const PAGE_SIZE = 8;
const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' });
const STATUS_LABELS: Record<CandidateReview['status'], string> = {
  pending: '待审核',
  needs_edit: '需修改',
  approved: '已通过',
  rejected: '已拒绝',
};
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

type CandidateReviewQueueProps = {
  state: SectionState<CandidateReview[]>;
  onReview: (candidateId: string) => void;
};

export function CandidateReviewQueue(props: CandidateReviewQueueProps) {
  return (
    <article className="card management-table-card">
      <div className="card-title-row">
        <div>
          <h3>候选题审核队列</h3>
          <p className="card-description">处理导入后生成的候选题并进入审核工作台。</p>
        </div>
      </div>
      {props.state.status === 'ready' ? (
        <ReadyCandidateTable candidates={props.state.data} onReview={props.onReview} />
      ) : (
        <SectionFeedback state={props.state} loadingMessage="正在加载候选题" />
      )}
    </article>
  );
}

function ReadyCandidateTable(props: { candidates: CandidateReview[]; onReview: (id: string) => void }) {
  const table = useCandidateTable(props.candidates);
  return (
    <>
      <AdminTableToolbar
        query={table.query}
        searchLabel="搜索候选题、标签或来源"
        resultLabel={`筛选出 ${table.pagination.total} 条`}
        filters={[table.statusFilter]}
        onQueryChange={table.changeQuery}
      />
      <CandidateTable candidates={table.pagination.items} onReview={props.onReview} />
      <AdminPagination {...table.pagination} onChange={table.setPage} />
    </>
  );
}

function useCandidateTable(candidates: CandidateReview[]) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CandidateReview['status'] | 'all'>('all');
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(
    () => filterCandidates(candidates, { query: deferredQuery, status }),
    [candidates, deferredQuery, status],
  );
  const changeStatus = (value: string) => {
    setStatus(value as CandidateReview['status'] | 'all');
    setPage(1);
  };
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  return {
    query,
    changeQuery,
    setPage,
    pagination: paginateRecords(filtered, page, PAGE_SIZE),
    statusFilter: { label: '状态', value: status, options: STATUS_OPTIONS, onChange: changeStatus },
  };
}

function CandidateTable(props: { candidates: CandidateReview[]; onReview: (id: string) => void }) {
  if (!props.candidates.length) {
    return <div className="empty-state compact-empty">没有匹配的候选题。</div>;
  }
  return (
    <div className="table-scroll">
      <table className="data-table management-table">
        <caption className="visually-hidden">候选题审核队列</caption>
        <thead>
          <tr>
            <th scope="col">候选题</th>
            <th scope="col">质量分</th>
            <th scope="col">状态</th>
            <th scope="col">创建时间</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          {props.candidates.map((candidate) => (
            <tr key={candidate.id}>
              <td>
                <strong>{candidate.title}</strong>
                <span>{candidate.tags.length ? candidate.tags.join(' · ') : '未标注标签'}</span>
              </td>
              <td>{candidate.qualityScore}</td>
              <td>
                <span className={candidateStatusClass(candidate.status)}>
                  {STATUS_LABELS[candidate.status]}
                </span>
              </td>
              <td>{DATE_FORMATTER.format(new Date(candidate.createdAt))}</td>
              <td>
                <button
                  className="button secondary compact-button table-action"
                  onClick={() => props.onReview(candidate.id)}
                  type="button"
                >
                  打开审核
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function candidateStatusClass(status: CandidateReview['status']): string {
  if (status === 'needs_edit') return 'status warn';
  if (status === 'rejected') return 'status danger';
  return 'status';
}
