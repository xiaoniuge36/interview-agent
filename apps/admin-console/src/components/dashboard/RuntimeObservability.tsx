import { EyeOutlined } from '@ant-design/icons';
import type { AgentRunDetailView } from '@interview-agent/contracts';
import { Button, Card, Empty, Space, Table, Tag, Typography, type TableColumnsType } from 'antd';
import React, { useState } from 'react';
import { useAdminListExport } from '@/hooks/useAdminListExport';
import { useAdminPagedList, type AdminPagedListController } from '@/hooks/useAdminPagedList';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import {
  commandLabel,
  formatRunTime,
  providerLabel,
  qualitySummary,
  RUN_STATUS_COLORS,
  stageLabel,
  STATUS_LABELS,
  tokenValue,
} from './runtime-observability-format';
import { RuntimeRunDetailsDrawer } from './RuntimeRunDetailsDrawer';
import { SectionFeedback } from './SectionState';

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'running', label: '运行中' },
  { value: 'succeeded', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'fallback', label: '已降级' },
] as const;

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
              status: value === 'all' ? undefined : (value as AgentRunDetailView['status']),
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

export function RunTable({ runs }: { runs: AgentRunDetailView[] }) {
  const [selected, setSelected] = useState<AgentRunDetailView | null>(null);
  if (!runs.length)
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的记录" />;
  return (
    <>
      <Table<AgentRunDetailView>
        columns={runColumns(setSelected)}
        dataSource={runs}
        pagination={false}
        rowKey="id"
        scroll={{ x: 1380 }}
        size="middle"
      />
      <RuntimeRunDetailsDrawer run={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function runColumns(
  onOpen: (run: AgentRunDetailView) => void,
): TableColumnsType<AgentRunDetailView> {
  return [
    { title: '状态', key: 'status', width: 88, render: (_, run) => runStatus(run) },
    { title: '用户 / 租户', key: 'user', width: 210, render: (_, run) => runUser(run) },
    { title: '面试任务', key: 'session', width: 250, render: (_, run) => runSession(run) },
    { title: '模型', key: 'model', width: 220, render: (_, run) => runModel(run) },
    { title: 'Token 消耗', key: 'tokens', width: 190, render: (_, run) => runTokens(run) },
    { title: '质量 / 耗时', key: 'quality', width: 170, render: (_, run) => qualitySummary(run) },
    { title: '更新时间', key: 'updatedAt', width: 170, render: (_, run) => runTime(run) },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 82,
      render: (_, run) => (
        <Button icon={<EyeOutlined />} size="small" type="link" onClick={() => onOpen(run)}>
          详情
        </Button>
      ),
    },
  ];
}

function runStatus(run: AgentRunDetailView) {
  return <Tag color={RUN_STATUS_COLORS[run.status]}>{STATUS_LABELS[run.status]}</Tag>;
}

function runUser(run: AgentRunDetailView) {
  return (
    <Space orientation="vertical" size={0}>
      <Typography.Text strong>{run.user?.name ?? '未知用户'}</Typography.Text>
      <Typography.Text type="secondary">{run.user?.email ?? '未登记邮箱'}</Typography.Text>
      <Typography.Text type="secondary">{run.tenant.name}</Typography.Text>
    </Space>
  );
}

function runSession(run: AgentRunDetailView) {
  return (
    <Space orientation="vertical" size={2}>
      <Typography.Text ellipsis={{ tooltip: run.sessionTitle ?? undefined }}>
        {run.sessionTitle ?? '未关联面试会话'}
      </Typography.Text>
      <Typography.Text type="secondary">
        {stageLabel(run.stage)} · {commandLabel(run.command)}
      </Typography.Text>
    </Space>
  );
}

function runModel(run: AgentRunDetailView) {
  if (!run.modelUsage) return <Tag>历史未采集</Tag>;
  return (
    <Space orientation="vertical" size={0}>
      <Typography.Text strong>{run.modelUsage.model}</Typography.Text>
      <Typography.Text type="secondary">
        {providerLabel(run.modelUsage.provider)} · {run.modelUsage.invocationCount} 次调用
      </Typography.Text>
    </Space>
  );
}

function runTokens(run: AgentRunDetailView) {
  const usage = run.modelUsage;
  if (!usage) return <Typography.Text type="secondary">历史未采集</Typography.Text>;
  return (
    <Space orientation="vertical" size={0}>
      <Typography.Text strong>{tokenValue(usage.totalTokens)} Token</Typography.Text>
      <Typography.Text type="secondary">
        输入 {tokenValue(usage.inputTokens)} · 输出 {tokenValue(usage.outputTokens)}
      </Typography.Text>
    </Space>
  );
}

function runTime(run: AgentRunDetailView) {
  return (
    <Typography.Text type="secondary">
      <time dateTime={run.updatedAt}>{formatRunTime(run.updatedAt)}</time>
    </Typography.Text>
  );
}
