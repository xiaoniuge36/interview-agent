import { Button, Space, Tag, Typography, type TableProps } from 'antd';
import type { ImportTask } from '@interview-agent/contracts';
import { formatAdminDateTime } from '@/lib/format';

const STATUS_LABELS: Record<ImportTask['status'], string> = {
  received: '已接收',
  processing: '处理中',
  review: '待审核',
  published: '已发布',
  failed: '失败',
};

export function importStatusOptions() {
  return [
    { value: 'all', label: '全部状态' },
    ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];
}

export function importTaskColumns(
  onReview: (taskId?: string) => void,
): NonNullable<TableProps<ImportTask>['columns']> {
  return [
    { title: '任务', dataIndex: 'title', render: (_, task) => <TaskCell task={task} /> },
    {
      title: '状态',
      dataIndex: 'status',
      width: 108,
      render: (status: ImportTask['status']) => (
        <Tag color={importStatusColor(status)}>{STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: '审核进度',
      dataIndex: 'candidateReviewProgress',
      width: 262,
      render: (_, task) => <CandidateReviewProgressCell task={task} />,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 156,
      render: (value) => formatAdminDateTime(value),
    },
    {
      title: '失败原因',
      dataIndex: 'failureReason',
      ellipsis: true,
      render: (value) => value ?? '—',
    },
    { title: '操作', key: 'actions', width: 96, render: (_, task) => reviewAction(task, onReview) },
  ];
}

function reviewAction(task: ImportTask, onReview: (taskId?: string) => void) {
  if (task.status !== 'review') return <Typography.Text type="secondary">—</Typography.Text>;
  return (
    <Button
      aria-label={`审核 ${task.title}`}
      size="small"
      type="link"
      onClick={() => onReview(task.id)}
    >
      去审核
    </Button>
  );
}

function TaskCell({ task }: { task: ImportTask }) {
  return (
    <div>
      <Typography.Text strong>{task.title}</Typography.Text>
      <br />
      <Typography.Text code type="secondary">
        {task.id}
      </Typography.Text>
    </div>
  );
}

type CandidateReviewProgressKey = keyof ImportTask['candidateReviewProgress'];

const CANDIDATE_REVIEW_PROGRESS_META: Record<
  CandidateReviewProgressKey,
  { color: string; label: string }
> = {
  pending: { color: 'gold', label: '待审' },
  needsEdit: { color: 'orange', label: '需修改' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已驳回' },
  published: { color: 'blue', label: '已发布' },
};
const REVIEW_PROGRESS_TAG_GAP = 4;

function CandidateReviewProgressCell({ task }: { task: ImportTask }) {
  const progressItems = (
    Object.keys(CANDIDATE_REVIEW_PROGRESS_META) as CandidateReviewProgressKey[]
  )
    .map((key) => ({
      ...CANDIDATE_REVIEW_PROGRESS_META[key],
      count: task.candidateReviewProgress[key],
    }))
    .filter((item) => item.count > 0);
  return (
    <div>
      <Typography.Text strong>共 {task.candidateCount} 题</Typography.Text>
      {progressItems.length ? (
        <Space size={[REVIEW_PROGRESS_TAG_GAP, REVIEW_PROGRESS_TAG_GAP]} wrap>
          {progressItems.map((item) => (
            <Tag color={item.color} key={item.label}>
              {item.label} {item.count}
            </Tag>
          ))}
        </Space>
      ) : (
        <Typography.Text type="secondary">尚未生成候选题</Typography.Text>
      )}
    </div>
  );
}

function importStatusColor(status: ImportTask['status']): string {
  return {
    received: 'default',
    processing: 'processing',
    review: 'warning',
    published: 'success',
    failed: 'error',
  }[status];
}
