import type { CandidateReview } from '@interview-agent/contracts';
import { App, Button, Empty, Table, Tag, Typography, type TableProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { AdminPagedListController } from '@/hooks/useAdminPagedList';
import { batchPublishCandidates, batchReviewCandidates } from '@/lib/training-content-api';
import { CandidateBatchReviewBar } from './CandidateBatchReviewBar';
import { resolveCandidateBatchReview } from './admin-records';

const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' });
const STATUS_LABELS: Record<CandidateReview['status'], string> = {
  pending: '待审核',
  needs_edit: '需修改',
  approved: '已通过',
  rejected: '已拒绝',
};

export const CANDIDATE_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

type CandidateQueueTableProps = {
  candidates: CandidateReview[];
  list: AdminPagedListController<'candidates'>;
  onChanged: () => void;
  onReview: (id: string) => void;
};

export function CandidateQueueTable(props: CandidateQueueTableProps) {
  const batch = useCandidateBatchReview(props);
  if (!props.candidates.length) return <CandidateQueueEmpty />;
  return (
    <>
      {batch.selectedCandidateIds.length ? <CandidateBatchReviewBar {...batch} /> : null}
      <Table
        columns={candidateColumns(props.onReview)}
        dataSource={props.candidates}
        pagination={false}
        rowKey="id"
        rowSelection={{
          selectedRowKeys: batch.selectedCandidateIds,
          onChange: (keys) => batch.setSelectedCandidateIds(keys.map(String)),
        }}
        scroll={{ x: 960 }}
        size="middle"
      />
    </>
  );
}

function useCandidateBatchReview(props: CandidateQueueTableProps) {
  const { message } = App.useApp();
  const [notes, setNotes] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [isSubmitting, setSubmitting] = useState(false);
  const selectedCandidates = useMemo(
    () => props.candidates.filter((candidate) => selectedCandidateIds.includes(candidate.id)),
    [props.candidates, selectedCandidateIds],
  );
  const selection = resolveCandidateBatchReview(selectedCandidates);

  useEffect(() => {
    setSelectedCandidateIds([]);
    setNotes('');
  }, [props.list.submittedQuery, props.candidates]);

  const onReview = (status: 'approved' | 'needs_edit' | 'rejected') => {
    void submitCandidateBatchReview({
      notes,
      props,
      selection,
      setNotes,
      setSelectedCandidateIds,
      setSubmitting,
      message,
      status,
    });
  };
  const onPublish = () => {
    void submitCandidateBatchPublish({
      props,
      selection,
      setNotes,
      setSelectedCandidateIds,
      setSubmitting,
      message,
    });
  };
  return {
    isSubmitting,
    notes,
    onNotesChange: setNotes,
    onPublish,
    onReview,
    selectedCandidateIds,
    selection,
    setSelectedCandidateIds,
  };
}

type SubmitCandidateBatchReview = {
  message: ReturnType<typeof App.useApp>['message'];
  notes: string;
  props: CandidateQueueTableProps;
  selection: ReturnType<typeof resolveCandidateBatchReview>;
  setNotes: (notes: string) => void;
  setSelectedCandidateIds: (ids: string[]) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  status: 'approved' | 'needs_edit' | 'rejected';
};

async function submitCandidateBatchReview(input: SubmitCandidateBatchReview) {
  if (!input.selection.canSubmit) return;
  input.setSubmitting(true);
  try {
    const result = await batchReviewCandidates({
      candidateIds: input.selection.candidateIds,
      status: input.status,
      reviewNotes: input.notes.trim() || null,
    });
    input.message.success(`已完成 ${result.updatedCount} 道候选题的批量审核。`);
    input.setSelectedCandidateIds([]);
    input.setNotes('');
    input.props.list.reload();
    input.props.onChanged();
  } catch {
    // 统一请求层会展示失败原因；此处只恢复批量操作状态。
  } finally {
    input.setSubmitting(false);
  }
}

type SubmitCandidateBatchPublish = Omit<SubmitCandidateBatchReview, 'notes' | 'status'>;

async function submitCandidateBatchPublish(input: SubmitCandidateBatchPublish) {
  if (!input.selection.canPublish) return;
  input.setSubmitting(true);
  try {
    const result = await batchPublishCandidates({
      candidateIds: input.selection.candidateIds,
      visibility: 'tenant',
    });
    const alreadyPublished = result.alreadyPublishedCount
      ? `，${result.alreadyPublishedCount} 道已在题库`
      : '';
    input.message.success(`已发布 ${result.publishedCount} 道候选题${alreadyPublished}。`);
    input.setSelectedCandidateIds([]);
    input.setNotes('');
    input.props.list.reload();
    input.props.onChanged();
  } catch {
    // 统一请求层会展示失败原因；此处只恢复批量操作状态。
  } finally {
    input.setSubmitting(false);
  }
}

function CandidateQueueEmpty() {
  return (
    <Empty
      description="没有匹配的候选题，可前往资料导入创建新任务。"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    />
  );
}

function candidateColumns(
  onReview: (id: string) => void,
): NonNullable<TableProps<CandidateReview>['columns']> {
  return [
    {
      title: '候选题',
      dataIndex: 'title',
      render: (_, candidate) => <QuestionCell candidate={candidate} />,
    },
    { title: '质量分', dataIndex: 'qualityScore', width: 92 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 112,
      render: (status: CandidateReview['status']) => (
        <Tag color={candidateStatusColor(status)}>{STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: '来源资料',
      key: 'sourceImport',
      width: 220,
      render: (_, candidate) => <SourceImportCell candidate={candidate} />,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 132,
      render: (value) => DATE_FORMATTER.format(new Date(value)),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 88,
      render: (_, candidate) => (
        <Button size="small" type="link" onClick={() => onReview(candidate.id)}>
          审核
        </Button>
      ),
    },
  ];
}

function SourceImportCell({ candidate }: { candidate: CandidateReview }) {
  if (!candidate.sourceImport)
    return <Typography.Text type="secondary">非导入来源</Typography.Text>;
  return (
    <div>
      <Typography.Text>{candidate.sourceImport.title}</Typography.Text>
      <br />
      <Typography.Text code type="secondary">
        {candidate.sourceImport.id}
      </Typography.Text>
    </div>
  );
}

function QuestionCell({ candidate }: { candidate: CandidateReview }) {
  return (
    <div>
      <Typography.Text strong>{candidate.title}</Typography.Text>
      <br />
      <Typography.Text type="secondary">
        {candidate.tags.length ? candidate.tags.join(' · ') : '未标注标签'}
      </Typography.Text>
    </div>
  );
}

function candidateStatusColor(status: CandidateReview['status']): string {
  return { pending: 'processing', needs_edit: 'warning', approved: 'success', rejected: 'error' }[
    status
  ];
}
