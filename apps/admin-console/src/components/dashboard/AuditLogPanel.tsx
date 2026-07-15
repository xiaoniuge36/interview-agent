import type { AuditLogView } from '@interview-agent/contracts';
import { Card, Empty, Space, Table, Tag, Typography, type TableColumnsType } from 'antd';
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
const RESULT_COLORS: Record<AuditLogView['result'], string> = {
  success: 'success',
  failure: 'error',
};

const AUDIT_COLUMNS: TableColumnsType<AuditLogView> = [
  {
    title: '动作 / Trace ID',
    key: 'action',
    width: 260,
    render: (_, log) => (
      <Space direction="vertical" size={0}>
        <Typography.Text strong>{log.action}</Typography.Text>
        <Typography.Text code copyable={{ text: log.traceId }}>
          {log.traceId}
        </Typography.Text>
      </Space>
    ),
  },
  {
    title: '资源',
    key: 'resource',
    width: 230,
    render: (_, log) => `${log.resourceType} · ${log.resourceId}`,
  },
  {
    title: '操作人',
    key: 'actor',
    width: 180,
    render: (_, log) => `${log.actorId} · ${log.actorRole}`,
  },
  {
    title: '结果',
    key: 'result',
    width: 100,
    render: (_, log) => (
      <Tag color={RESULT_COLORS[log.result]}>{log.result === 'failure' ? '失败' : '成功'}</Tag>
    ),
  },
  {
    title: '时间',
    key: 'createdAt',
    width: 180,
    render: (_, log) => (
      <Typography.Text type="secondary">
        <time dateTime={log.createdAt}>{DATE_FORMATTER.format(new Date(log.createdAt))}</time>
      </Typography.Text>
    ),
  },
];

export function AuditLogPanel({ state }: { state: SectionState<AuditLogView[]> }) {
  return (
    <section className="admin-page" id="section-6" aria-labelledby="audit-heading">
      <Card className="admin-dense-card admin-table-card" size="small">
        <div className="admin-page-heading">
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
      </Card>
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
  if (!logs.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的记录" />;
  }
  return (
    <Table<AuditLogView>
      columns={AUDIT_COLUMNS}
      dataSource={logs}
      pagination={false}
      rowKey="id"
      scroll={{ x: 900 }}
      size="middle"
    />
  );
}
