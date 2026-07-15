import { Alert, Button, Card, Empty, Table, Tag, Typography, type TableProps } from 'antd';
import type { ImportTask } from '@interview-agent/contracts';
import { useDeferredValue, useMemo, useState } from 'react';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { AdminDrawer } from './AdminDrawer';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { paginateRecords } from './admin-records';
import { ImportPipeline } from './ImportPipeline';
import { SectionFeedback } from './SectionState';
import { MarkdownImportForm } from './training-content/MarkdownImportForm';

const PAGE_SIZE = 6;
const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
const STATUS_LABELS: Record<ImportTask['status'], string> = {
  received: '已接收',
  processing: '处理中',
  review: '待审核',
  published: '已发布',
  failed: '失败',
};

type ImportCenterProps = {
  dashboard: Parameters<typeof ImportPipeline>[0]['state'];
  imports: SectionState<ImportTask[]>;
  onChanged: () => void;
};

export function ImportCenter(props: ImportCenterProps) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [message, setMessage] = useState('');
  const completeImport = () => { setDrawerOpen(false); setMessage('导入任务已创建，列表正在刷新。'); };
  return (
    <section className="admin-page" aria-labelledby="import-center-heading">
      <div className="admin-page-heading admin-page-heading-actions">
        <div>
          <Typography.Title id="import-center-heading" level={3}>资料导入与任务记录</Typography.Title>
          <Typography.Text type="secondary">导入只会生成待审核候选题，不会绕过治理流程直接发布。</Typography.Text>
        </div>
        <Button type="primary" onClick={() => { setMessage(''); setDrawerOpen(true); }}>导入资料</Button>
      </div>
      {message ? <Alert message={message} showIcon type="success" /> : null}
      <ImportHistory state={props.imports} />
      <ImportPipeline state={props.dashboard} />
      <AdminDrawer description="提交后系统会创建导入任务，并生成待审核候选题。" open={isDrawerOpen} title="导入 Markdown 资料" onClose={() => setDrawerOpen(false)}>
        <MarkdownImportForm onChanged={props.onChanged} onCompleted={completeImport} />
      </AdminDrawer>
    </section>
  );
}

function ImportHistory({ state }: { state: SectionState<ImportTask[]> }) {
  if (state.status !== 'ready') return <Card className="admin-table-card" title="最近导入任务"><SectionFeedback state={state} loadingMessage="正在加载导入任务" /></Card>;
  return <ReadyImportHistory tasks={state.data} />;
}

function ReadyImportHistory({ tasks }: { tasks: ImportTask[] }) {
  const history = useImportHistory(tasks);
  return (
    <Card className="admin-table-card" title="最近导入任务">
      <AdminTableToolbar filters={[history.statusFilter]} query={history.query} resultLabel={`筛选出 ${history.pagination.total} 条`} searchLabel="搜索任务名称或 ID" onQueryChange={history.changeQuery} />
      <ImportTaskTable tasks={history.pagination.items} />
      <AdminPagination {...history.pagination} onChange={history.setPage} />
    </Card>
  );
}

function useImportHistory(tasks: ImportTask[]) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ImportTask['status'] | 'all'>('all');
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(() => tasks.filter((task) => matchesImportTask(task, deferredQuery, status)), [deferredQuery, status, tasks]);
  const changeQuery = (value: string) => { setQuery(value); setPage(1); };
  const changeStatus = (value: string) => { setStatus(value as ImportTask['status'] | 'all'); setPage(1); };
  return {
    query,
    pagination: paginateRecords(filtered, page, PAGE_SIZE),
    setPage,
    changeQuery,
    statusFilter: { label: '状态', value: status, options: importStatusOptions(), onChange: changeStatus },
  };
}

function ImportTaskTable({ tasks }: { tasks: ImportTask[] }) {
  if (!tasks.length) return <Empty description="没有匹配的导入任务。" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  const columns: TableProps<ImportTask>['columns'] = [
    { title: '任务', dataIndex: 'title', render: (_, task) => <TaskCell task={task} /> },
    { title: '状态', dataIndex: 'status', width: 108, render: (status: ImportTask['status']) => <Tag color={importStatusColor(status)}>{STATUS_LABELS[status]}</Tag> },
    { title: '候选题', dataIndex: 'candidateCount', width: 84 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 156, render: (value) => DATE_FORMATTER.format(new Date(value)) },
    { title: '失败原因', dataIndex: 'failureReason', ellipsis: true, render: (value) => value ?? '—' },
  ];
  return <Table columns={columns} dataSource={tasks} pagination={false} rowKey="id" scroll={{ x: 860 }} size="middle" />;
}

function TaskCell({ task }: { task: ImportTask }) {
  return <div><Typography.Text strong>{task.title}</Typography.Text><br /><Typography.Text code type="secondary">{task.id}</Typography.Text></div>;
}

function matchesImportTask(task: ImportTask, query: string, status: ImportTask['status'] | 'all'): boolean {
  const keyword = query.trim().toLocaleLowerCase('zh-CN');
  const matchesQuery = !keyword || `${task.title} ${task.id}`.toLocaleLowerCase('zh-CN').includes(keyword);
  return matchesQuery && (status === 'all' || task.status === status);
}

function importStatusOptions() {
  return [{ value: 'all', label: '全部状态' }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))];
}

function importStatusColor(status: ImportTask['status']): string {
  return { received: 'default', processing: 'processing', review: 'warning', published: 'success', failed: 'error' }[status];
}
