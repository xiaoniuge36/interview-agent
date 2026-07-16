import type { AgentRunView } from '@interview-agent/contracts';
import { Card, Empty, Table, Tag, Typography, type TableColumnsType } from 'antd';
import { useAdminListExport } from '@/hooks/useAdminListExport';
import { useAdminPagedList, type AdminPagedListController } from '@/hooks/useAdminPagedList';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { SectionFeedback } from './SectionState';

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
const RUN_STATUS_COLORS: Record<AgentRunView['status'], string> = {
  running: 'processing',
  succeeded: 'success',
  failed: 'error',
  fallback: 'warning',
};

export function RuntimeObservability({
  active,
  refreshKey,
}: {
  active: boolean;
  refreshKey: number;
}) {
  const list = useAdminPagedList('agent-runs', { enabled: active, reloadKey: refreshKey });
  const { exportList, isExporting } = useAdminListExport('agent-runs', list.submittedQuery);
  return (
    <section className="admin-page" id="section-5" aria-labelledby="runs-heading">
      <Card className="admin-dense-card admin-table-card" size="small">
        <div className="admin-page-heading">
          <div>
            <div className="eyebrow">Runtime Observability</div>
            <h2 id="runs-heading">Agent 运行观测</h2>
          </div>
          <p>跟踪执行阶段、延迟、降级与结构化输出结果。</p>
        </div>
        <RunListContent exportList={exportList} isExporting={isExporting} list={list} />
      </Card>
    </section>
  );
}

type RunListContentProps = {
  exportList: () => Promise<void>;
  isExporting: boolean;
  list: AdminPagedListController<'agent-runs'>;
};

function RunListContent({ exportList, isExporting, list }: RunListContentProps) {
  if (list.state.status !== 'ready')
    return <SectionFeedback state={list.state} loadingMessage="正在加载 Agent 运行记录" />;
  const page = list.state.data;
  return (
    <>
      <RunToolbar
        exportList={exportList}
        isExporting={isExporting}
        list={list}
        total={page.total}
      />
      <RunTable runs={page.items} />
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

type RunToolbarProps = RunListContentProps & { total: number };

function RunToolbar({ exportList, isExporting, list, total }: RunToolbarProps) {
  return (
    <AdminTableToolbar
      filters={[
        {
          label: '状态',
          value: list.draftQuery.status ?? 'all',
          options: STATUS_OPTIONS,
          onChange: (value) =>
            list.setDraftQuery((current) => ({
              ...current,
              status: value === 'all' ? undefined : (value as AgentRunView['status']),
            })),
        },
      ]}
      isExporting={isExporting}
      isLoading={list.isLoading}
      query={list.draftQuery.keyword ?? ''}
      resultLabel={`共 ${total} 条`}
      searchLabel="搜索阶段或 Trace ID"
      onExport={() => void exportList()}
      onQuery={list.query}
      onQueryChange={(keyword) => list.setDraftQuery((current) => ({ ...current, keyword }))}
      onReset={list.reset}
    />
  );
}

function RunTable({ runs }: { runs: AgentRunView[] }) {
  if (!runs.length)
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的记录" />;
  return (
    <Table<AgentRunView>
      columns={RUN_COLUMNS}
      dataSource={runs}
      pagination={false}
      rowKey="id"
      scroll={{ x: 900 }}
      size="middle"
    />
  );
}

const RUN_COLUMNS: TableColumnsType<AgentRunView> = [
  {
    title: '状态',
    key: 'status',
    width: 104,
    render: (_, run) => (
      <Tag color={RUN_STATUS_COLORS[run.status]}>{STATUS_LABELS[run.status]}</Tag>
    ),
  },
  { title: '阶段', dataIndex: 'stage', width: 180, ellipsis: true },
  { title: '质量与延迟', key: 'quality', width: 190, render: (_, run) => qualitySummary(run) },
  {
    title: 'Trace ID',
    key: 'traceId',
    width: 220,
    render: (_, run) => (
      <Typography.Text code copyable={{ text: run.traceId }}>
        {run.traceId}
      </Typography.Text>
    ),
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: 180,
    render: (_, run) => (
      <Typography.Text type="secondary">
        <time dateTime={run.updatedAt}>{DATE_FORMATTER.format(new Date(run.updatedAt))}</time>
      </Typography.Text>
    ),
  },
];

function qualitySummary(run: AgentRunView): string {
  const latency = run.latencyMs === null ? '无延迟数据' : `${run.latencyMs} ms`;
  return run.schemaValid === null
    ? `未校验 · ${latency}`
    : `${run.schemaValid ? 'Schema 通过' : 'Schema 失败'} · ${latency}`;
}
