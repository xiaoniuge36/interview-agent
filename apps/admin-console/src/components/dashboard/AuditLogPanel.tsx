import type { AuditLogView } from '@interview-agent/contracts';
import { Card, Empty, Space, Table, Tag, Typography, type TableColumnsType } from 'antd';
import { useAdminListExport } from '@/hooks/useAdminListExport';
import { useAdminPagedList, type AdminPagedListController } from '@/hooks/useAdminPagedList';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { SectionFeedback } from './SectionState';

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

export function AuditLogPanel({ active, refreshKey }: { active: boolean; refreshKey: number }) {
  const list = useAdminPagedList('audit-logs', { enabled: active, reloadKey: refreshKey });
  const { exportList, isExporting } = useAdminListExport('audit-logs', list.submittedQuery);
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
        <AuditListContent exportList={exportList} isExporting={isExporting} list={list} />
      </Card>
    </section>
  );
}

type AuditListContentProps = {
  exportList: () => Promise<void>;
  isExporting: boolean;
  list: AdminPagedListController<'audit-logs'>;
};

function AuditListContent({ exportList, isExporting, list }: AuditListContentProps) {
  if (list.state.status !== 'ready')
    return <SectionFeedback state={list.state} loadingMessage="正在加载审计日志" />;
  const page = list.state.data;
  return (
    <>
      <AuditToolbar
        exportList={exportList}
        isExporting={isExporting}
        list={list}
        total={page.total}
      />
      <AuditTable logs={page.items} />
      <AdminPagination
        page={page.page}
        pageSize={page.pageSize}
        total={page.total}
        onChange={list.setPage}
        onPageSizeChange={list.setPageSize}
      />
    </>
  );
}

type AuditToolbarProps = AuditListContentProps & { total: number };

function AuditToolbar({ exportList, isExporting, list, total }: AuditToolbarProps) {
  return (
    <AdminTableToolbar
      filters={[
        {
          label: '结果',
          value: list.draftQuery.result ?? 'all',
          options: RESULT_OPTIONS,
          onChange: (value) =>
            list.setDraftQuery((current) => ({
              ...current,
              result: value === 'all' ? undefined : (value as AuditLogView['result']),
            })),
        },
      ]}
      isExporting={isExporting}
      isLoading={list.isLoading}
      query={list.draftQuery.keyword ?? ''}
      resultLabel={`共 ${total} 条`}
      searchLabel="搜索动作、资源、操作者或 Trace ID"
      onExport={() => void exportList()}
      onQuery={list.query}
      onQueryChange={(keyword) => list.setDraftQuery((current) => ({ ...current, keyword }))}
      onReset={list.reset}
    />
  );
}

function AuditTable({ logs }: { logs: AuditLogView[] }) {
  if (!logs.length)
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的记录" />;
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
