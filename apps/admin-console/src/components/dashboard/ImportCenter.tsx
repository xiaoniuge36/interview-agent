import { FileSearchOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, Space, Table, Tag, Typography, type TableProps } from 'antd';
import type { ImportTask } from '@interview-agent/contracts';
import { useState } from 'react';
import { useAdminListExport } from '@/hooks/useAdminListExport';
import { useAdminPagedList, type AdminPagedListController } from '@/hooks/useAdminPagedList';
import { AdminDrawer } from './AdminDrawer';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { ImportPipeline } from './ImportPipeline';
import { SectionFeedback } from './SectionState';
import { MarkdownImportForm } from './training-content/MarkdownImportForm';

const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
const STATUS_LABELS: Record<ImportTask['status'], string> = {
  received: '已接收',
  processing: '处理中',
  review: '待审核',
  published: '已发布',
  failed: '失败',
};

type ImportCenterProps = {
  active: boolean;
  dashboard: Parameters<typeof ImportPipeline>[0]['state'];
  onChanged: () => void;
  onNavigate: (importTaskId?: string) => void;
  refreshKey: number;
};

export function ImportCenter({
  active,
  dashboard,
  onChanged,
  onNavigate,
  refreshKey,
}: ImportCenterProps) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [message, setMessage] = useState('');
  const list = useAdminPagedList('imports', { enabled: active, reloadKey: refreshKey });
  const { exportList, isExporting } = useAdminListExport('imports', list.submittedQuery);
  const completeImport = () => {
    setDrawerOpen(false);
    setMessage('导入任务已创建，列表正在刷新。');
  };
  const refreshAfterImport = () => {
    onChanged();
  };
  return (
    <section className="admin-page" aria-labelledby="import-center-heading">
      <ImportCenterHeader
        onNavigate={onNavigate}
        onOpen={() => {
          setMessage('');
          setDrawerOpen(true);
        }}
      />
      {message ? <Alert message={message} showIcon type="success" /> : null}
      <ImportHistory
        exportList={exportList}
        isExporting={isExporting}
        list={list}
        onReview={onNavigate}
      />
      <ImportPipeline state={dashboard} />
      <ImportDrawer
        open={isDrawerOpen}
        onChanged={refreshAfterImport}
        onClose={() => setDrawerOpen(false)}
        onCompleted={completeImport}
      />
    </section>
  );
}

function ImportCenterHeader({
  onNavigate,
  onOpen,
}: {
  onNavigate: (importTaskId?: string) => void;
  onOpen: () => void;
}) {
  return (
    <div className="admin-page-heading admin-page-heading-actions">
      <div>
        <Typography.Title id="import-center-heading" level={3}>
          资料导入与任务记录
        </Typography.Title>
        <Typography.Text type="secondary">
          导入只会生成待审核候选题，不会绕过治理流程直接发布。
        </Typography.Text>
      </div>
      <Space>
        <Button icon={<FileSearchOutlined />} onClick={() => onNavigate()}>
          审核待办
        </Button>
        <Button type="primary" onClick={onOpen}>
          导入资料
        </Button>
      </Space>
    </div>
  );
}

type ImportDrawerProps = {
  open: boolean;
  onChanged: () => void;
  onClose: () => void;
  onCompleted: () => void;
};

function ImportDrawer({ onChanged, onClose, onCompleted, open }: ImportDrawerProps) {
  return (
    <AdminDrawer
      description="提交后系统会创建导入任务，并生成待审核候选题。"
      open={open}
      title="导入 Markdown 资料"
      onClose={onClose}
    >
      <MarkdownImportForm onChanged={onChanged} onCompleted={onCompleted} />
    </AdminDrawer>
  );
}

type ImportHistoryProps = {
  exportList: () => Promise<void>;
  isExporting: boolean;
  list: AdminPagedListController<'imports'>;
  onReview: (taskId?: string) => void;
};

function ImportHistory({ exportList, isExporting, list, onReview }: ImportHistoryProps) {
  const page = list.state.status === 'ready' ? list.state.data : null;
  return (
    <Card className="admin-table-card" title="最近导入任务">
      {page ? (
        <>
          <AdminTableToolbar
            filters={[
              {
                label: '状态',
                value: list.draftQuery.status ?? 'all',
                options: importStatusOptions(),
                onChange: (value) =>
                  list.setDraftQuery((current) => ({
                    ...current,
                    status: value === 'all' ? undefined : (value as ImportTask['status']),
                  })),
              },
            ]}
            isExporting={isExporting}
            isLoading={list.isLoading}
            query={list.draftQuery.keyword ?? ''}
            resultLabel={`共 ${page.total} 条`}
            searchLabel="搜索任务名称"
            onExport={() => void exportList()}
            onQuery={list.query}
            onQueryChange={(keyword) => list.setDraftQuery((current) => ({ ...current, keyword }))}
            onReset={list.reset}
          />
          <ImportTaskTable tasks={page.items} onReview={onReview} />
          <AdminPagination
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            onChange={list.setPage}
            onPageSizeChange={list.setPageSize}
          />
        </>
      ) : (
        <SectionFeedback state={list.state} loadingMessage="正在加载导入任务" />
      )}
    </Card>
  );
}

function ImportTaskTable({
  onReview,
  tasks,
}: {
  onReview: (taskId?: string) => void;
  tasks: ImportTask[];
}) {
  if (!tasks.length)
    return <Empty description="没有匹配的导入任务。" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  return (
    <Table
      columns={importTaskColumns(onReview)}
      dataSource={tasks}
      pagination={false}
      rowKey="id"
      scroll={{ x: 1040 }}
      size="middle"
    />
  );
}

function importTaskColumns(
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
      render: (value) => DATE_FORMATTER.format(new Date(value)),
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

function importStatusOptions() {
  return [
    { value: 'all', label: '全部状态' },
    ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];
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
