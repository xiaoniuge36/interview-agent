import { Button, Card, Empty, Table, Tag, Typography, type TableProps } from 'antd';
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
    <Card className="admin-table-card" title="候选题审核列表">
      <Typography.Paragraph type="secondary">筛选待办候选题，点击“审核”后再打开详情编辑。</Typography.Paragraph>
      {props.state.status === 'ready' ? <ReadyCandidateTable candidates={props.state.data} onReview={props.onReview} /> : <SectionFeedback state={props.state} loadingMessage="正在加载候选题" />}
    </Card>
  );
}

function ReadyCandidateTable(props: { candidates: CandidateReview[]; onReview: (id: string) => void }) {
  const table = useCandidateTable(props.candidates);
  return (
    <>
      <AdminTableToolbar filters={[table.statusFilter]} query={table.query} resultLabel={`筛选出 ${table.pagination.total} 条`} searchLabel="搜索候选题、标签或来源" onQueryChange={table.changeQuery} />
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
  const filtered = useMemo(() => filterCandidates(candidates, { query: deferredQuery, status }), [candidates, deferredQuery, status]);
  const changeStatus = (value: string) => { setStatus(value as CandidateReview['status'] | 'all'); setPage(1); };
  const changeQuery = (value: string) => { setQuery(value); setPage(1); };
  return {
    query,
    changeQuery,
    setPage,
    pagination: paginateRecords(filtered, page, PAGE_SIZE),
    statusFilter: { label: '状态', value: status, options: STATUS_OPTIONS, onChange: changeStatus },
  };
}

function CandidateTable({ candidates, onReview }: { candidates: CandidateReview[]; onReview: (id: string) => void }) {
  if (!candidates.length) return <Empty description="没有匹配的候选题，可前往资料导入创建新任务。" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  const columns: TableProps<CandidateReview>['columns'] = [
    { title: '候选题', dataIndex: 'title', render: (_, candidate) => <QuestionCell candidate={candidate} /> },
    { title: '质量分', dataIndex: 'qualityScore', width: 92 },
    { title: '状态', dataIndex: 'status', width: 112, render: (status: CandidateReview['status']) => <Tag color={candidateStatusColor(status)}>{STATUS_LABELS[status]}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', width: 132, render: (value) => DATE_FORMATTER.format(new Date(value)) },
    { title: '操作', key: 'action', fixed: 'right', width: 88, render: (_, candidate) => <Button size="small" type="link" onClick={() => onReview(candidate.id)}>审核</Button> },
  ];
  return <Table columns={columns} dataSource={candidates} pagination={false} rowKey="id" scroll={{ x: 760 }} size="middle" />;
}

function QuestionCell({ candidate }: { candidate: CandidateReview }) {
  return (
    <SpaceText primary={candidate.title} secondary={candidate.tags.length ? candidate.tags.join(' · ') : '未标注标签'} />
  );
}

function SpaceText({ primary, secondary }: { primary: string; secondary: string }) {
  return <div><Typography.Text strong>{primary}</Typography.Text><br /><Typography.Text type="secondary">{secondary}</Typography.Text></div>;
}

function candidateStatusColor(status: CandidateReview['status']): string {
  return { pending: 'processing', needs_edit: 'warning', approved: 'success', rejected: 'error' }[status];
}
