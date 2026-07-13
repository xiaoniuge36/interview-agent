import type { AuditLogView } from '@interview-agent/contracts';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { SectionFeedback } from './SectionState';

const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

export function AuditLogPanel({ state }: { state: SectionState<AuditLogView[]> }) {
  return (
    <section id="section-5" className="card" aria-labelledby="audit-heading">
      <div className="section-heading compact-heading">
        <div>
          <div className="eyebrow">Audit Trail</div>
          <h2 id="audit-heading">审计日志</h2>
        </div>
        <p>记录治理动作、操作者、结果与跨服务追踪标识。</p>
      </div>
      {state.status === 'ready' ? (
        <AuditTable logs={state.data} />
      ) : (
        <SectionFeedback state={state} loadingMessage="正在加载审计日志" />
      )}
    </section>
  );
}

function AuditTable({ logs }: { logs: AuditLogView[] }) {
  if (!logs.length) return <div className="empty-state">暂无审计日志。</div>;
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
