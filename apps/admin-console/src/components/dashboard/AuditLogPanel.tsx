import type { AuditLogView } from '@interview-agent/contracts';
import { useDeferredValue, useMemo, useState } from 'react';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { filterAuditLogs, paginateRecords } from './admin-records';
import { SectionFeedback } from './SectionState';

const PAGE_SIZE = 12;
const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'short',
  timeStyle: 'medium',
});
const RESULT_OPTIONS = [
  { value: 'all', label: '全部结果' },
  { value: 'success', label: '成功' },
  { value: 'failure', label: '失败' },
] as const;

export function AuditLogPanel({ state }: { state: SectionState<AuditLogView[]> }) {
  return (
    <section id="section-6" className="card" aria-labelledby="audit-heading">
      <div className="section-heading compact-heading">
        <div>
          <div className="eyebrow">Audit Trail</div>
          <h2 id="audit-heading">审计日志</h2>
        </div>
        <p>记录治理动作、操作者、结果与跨服务追踪标识。</p>
      </div>
      {state.status === 'ready' ? (
        <ReadyAuditTable logs={state.data} />
      ) : (
        <SectionFeedback state={state} loadingMessage="正在加载审计日志" />
      )}
    </section>
  );
}

function ReadyAuditTable({ logs }: { logs: AuditLogView[] }) {
  const table = useAuditFilters(logs);
  return (
    <>
      <AdminTableToolbar
        query={table.query}
        searchLabel="搜索动作、资源、操作者或 Trace ID"
        resultLabel={`筛选出 ${table.pagination.total} 条`}
        filters={[table.resultFilter]}
        onQueryChange={table.changeQuery}
      />
      <AuditTable logs={table.pagination.items} />
      <AdminPagination {...table.pagination} onChange={table.setPage} />
    </>
  );
}

function useAuditFilters(logs: AuditLogView[]) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AuditLogView['result'] | 'all'>('all');
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(
    () => filterAuditLogs(logs, { query: deferredQuery, result }),
    [deferredQuery, logs, result],
  );
  const changeResult = (value: string) => {
    setResult(value as AuditLogView['result'] | 'all');
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
    resultFilter: { label: '结果', value: result, options: RESULT_OPTIONS, onChange: changeResult },
  };
}

function AuditTable({ logs }: { logs: AuditLogView[] }) {
  if (!logs.length) return <div className="empty-state compact-empty">没有匹配的审计日志。</div>;
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="visually-hidden">治理审计日志</caption>
        <thead>
          <tr>
            <th scope="col">动作</th>
            <th scope="col">资源</th>
            <th scope="col">操作者</th>
            <th scope="col">结果</th>
            <th scope="col">时间</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <AuditRow key={log.id} log={log} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditRow({ log }: { log: AuditLogView }) {
  return (
    <tr>
      <td>
        <strong>{log.action}</strong>
        <code>{log.traceId}</code>
      </td>
      <td>
        {log.resourceType} · {log.resourceId}
      </td>
      <td>
        {log.actorId} · {log.actorRole}
      </td>
      <td>
        <span className={log.result === 'failure' ? 'status danger' : 'status'}>
          {log.result === 'failure' ? '失败' : '成功'}
        </span>
      </td>
      <td>
        <time dateTime={log.createdAt}>{DATE_FORMATTER.format(new Date(log.createdAt))}</time>
      </td>
    </tr>
  );
}
