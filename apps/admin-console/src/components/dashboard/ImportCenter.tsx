import type { ImportTask } from '@interview-agent/contracts';
import { useDeferredValue, useMemo, useState } from 'react';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { paginateRecords } from './admin-records';
import { ImportPipeline } from './ImportPipeline';
import { SectionFeedback } from './SectionState';
import { MarkdownImportForm } from './training-content/MarkdownImportForm';

const PAGE_SIZE = 6;
const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'short',
  timeStyle: 'short',
});
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
  return (
    <>
      <section aria-labelledby="import-center-heading">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Source Operations</div>
            <h2 id="import-center-heading">资料导入与任务记录</h2>
          </div>
          <p>导入只会生成待审核候选题，不会绕过治理流程直接发布。</p>
        </div>
        <div className="import-center-grid">
          <MarkdownImportForm onChanged={props.onChanged} />
          <ImportHistory state={props.imports} />
        </div>
      </section>
      <ImportPipeline state={props.dashboard} />
    </>
  );
}

function ImportHistory({ state }: { state: SectionState<ImportTask[]> }) {
  if (state.status !== 'ready') {
    return (
      <article className="card import-history-card">
        <h3>最近导入任务</h3>
        <SectionFeedback state={state} loadingMessage="正在加载导入任务" />
      </article>
    );
  }
  return <ReadyImportHistory tasks={state.data} />;
}

function ReadyImportHistory({ tasks }: { tasks: ImportTask[] }) {
  const history = useImportHistory(tasks);
  return (
    <article className="card import-history-card">
      <div className="card-title-row">
        <div>
          <h3>最近导入任务</h3>
          <p className="card-description">追踪处理状态、候选题数量与失败原因。</p>
        </div>
      </div>
      <AdminTableToolbar
        query={history.query}
        searchLabel="搜索任务名称或 ID"
        resultLabel={`筛选出 ${history.pagination.total} 条`}
        filters={[history.statusFilter]}
        onQueryChange={history.changeQuery}
      />
      <ImportTaskList tasks={history.pagination.items} />
      <AdminPagination {...history.pagination} onChange={history.setPage} />
    </article>
  );
}

function useImportHistory(tasks: ImportTask[]) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ImportTask['status'] | 'all'>('all');
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(
    () => tasks.filter((task) => matchesImportTask(task, deferredQuery, status)),
    [deferredQuery, status, tasks],
  );
  const pagination = paginateRecords(filtered, page, PAGE_SIZE);
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const changeStatus = (value: string) => {
    setStatus(value as ImportTask['status'] | 'all');
    setPage(1);
  };
  return {
    query,
    pagination,
    setPage,
    changeQuery,
    statusFilter: { label: '状态', value: status, options: importStatusOptions(), onChange: changeStatus },
  };
}

function ImportTaskList({ tasks }: { tasks: ImportTask[] }) {
  if (!tasks.length) return <div className="empty-state compact-empty">没有匹配的导入任务。</div>;
  return (
    <ul className="import-task-list">
      {tasks.map((task) => (
        <li key={task.id}>
          <div>
            <strong>{task.title}</strong>
            <code>{task.id}</code>
          </div>
          <div className="import-task-meta">
            <span className={task.status === 'failed' ? 'status danger' : 'status'}>
              {STATUS_LABELS[task.status]}
            </span>
            <small>{task.candidateCount} 道候选题</small>
            <time dateTime={task.updatedAt}>{DATE_FORMATTER.format(new Date(task.updatedAt))}</time>
          </div>
          {task.failureReason ? <p role="alert">{task.failureReason}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function matchesImportTask(
  task: ImportTask,
  query: string,
  status: ImportTask['status'] | 'all',
): boolean {
  const keyword = query.trim().toLocaleLowerCase('zh-CN');
  const matchesQuery = !keyword || `${task.title} ${task.id}`.toLocaleLowerCase('zh-CN').includes(keyword);
  return matchesQuery && (status === 'all' || task.status === status);
}

function importStatusOptions() {
  return [
    { value: 'all', label: '全部状态' },
    ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];
}
