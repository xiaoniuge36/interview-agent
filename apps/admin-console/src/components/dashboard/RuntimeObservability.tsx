import type { AgentRunView } from '@interview-agent/contracts';
import { useDeferredValue, useMemo, useState } from 'react';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { filterRuns, paginateRecords } from './admin-records';
import { SectionFeedback } from './SectionState';

const PAGE_SIZE = 10;
const STATUS_LABELS: Record<AgentRunView['status'], string> = {
  running: '运行中',
  succeeded: '成功',
  failed: '失败',
  fallback: '已降级',
};
const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'short',
  timeStyle: 'medium',
});
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'running', label: '运行中' },
  { value: 'succeeded', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'fallback', label: '已降级' },
] as const;

export function RuntimeObservability({ state }: { state: SectionState<AgentRunView[]> }) {
  return (
    <section id="section-5" className="card" aria-labelledby="runs-heading">
      <div className="section-heading compact-heading">
        <div>
          <div className="eyebrow">Runtime Observability</div>
          <h2 id="runs-heading">Agent 运行观测</h2>
        </div>
        <p>跟踪执行阶段、延迟、降级与结构化输出结果。</p>
      </div>
      {state.status === 'ready' ? (
        <ReadyRunTable runs={state.data} />
      ) : (
        <SectionFeedback state={state} loadingMessage="正在加载 Agent 运行记录" />
      )}
    </section>
  );
}

function ReadyRunTable({ runs }: { runs: AgentRunView[] }) {
  const table = useRunFilters(runs);
  return (
    <>
      <AdminTableToolbar
        query={table.query}
        searchLabel="搜索阶段或 Trace ID"
        resultLabel={`筛选出 ${table.pagination.total} 条`}
        filters={[table.statusFilter]}
        onQueryChange={table.changeQuery}
      />
      <RunTable runs={table.pagination.items} />
      <AdminPagination {...table.pagination} onChange={table.setPage} />
    </>
  );
}

function useRunFilters(runs: AgentRunView[]) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<AgentRunView['status'] | 'all'>('all');
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(
    () => filterRuns(runs, { query: deferredQuery, status }),
    [deferredQuery, runs, status],
  );
  const changeStatus = (value: string) => {
    setStatus(value as AgentRunView['status'] | 'all');
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

function RunTable({ runs }: { runs: AgentRunView[] }) {
  if (!runs.length) return <div className="empty-state compact-empty">没有匹配的运行记录。</div>;
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="visually-hidden">Agent 运行记录</caption>
        <thead>
          <tr>
            <th scope="col">状态</th>
            <th scope="col">阶段</th>
            <th scope="col">质量与延迟</th>
            <th scope="col">Trace ID</th>
            <th scope="col">更新时间</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RunRow({ run }: { run: AgentRunView }) {
  return (
    <tr>
      <td>
        <span className={runStatusClass(run.status)}>{STATUS_LABELS[run.status]}</span>
      </td>
      <td>{run.stage}</td>
      <td>{qualitySummary(run)}</td>
      <td>
        <code>{run.traceId}</code>
      </td>
      <td>
        <time dateTime={run.updatedAt}>{DATE_FORMATTER.format(new Date(run.updatedAt))}</time>
      </td>
    </tr>
  );
}

function qualitySummary(run: AgentRunView): string {
  const latency = run.latencyMs === null ? '无延迟数据' : run.latencyMs + ' ms';
  if (run.schemaValid === null) return '未校验 · ' + latency;
  return (run.schemaValid ? 'Schema 通过' : 'Schema 失败') + ' · ' + latency;
}

function runStatusClass(status: AgentRunView['status']): string {
  if (status === 'failed') return 'status danger';
  if (status === 'fallback') return 'status warn';
  return 'status';
}
