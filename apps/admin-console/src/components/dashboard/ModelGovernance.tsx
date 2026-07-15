import type { ModelProfile } from '@interview-agent/contracts';
import { Card, Empty, Space, Table, Tag, Typography, type TableColumnsType } from 'antd';
import { useDeferredValue, useMemo, useState } from 'react';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { filterModels, paginateRecords } from './admin-records';
import { SectionFeedback } from './SectionState';

const PAGE_SIZE = 8;
const COMPACT_TAG_GAP = 4;
const STATUS_LABELS: Record<ModelProfile['status'], string> = {
  active: '启用',
  standby: '备用',
  disabled: '停用',
};
const BUDGET_LABELS: Record<ModelProfile['budget'], string> = {
  low: '低预算',
  medium: '中预算',
  high: '高预算',
};
const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '启用' },
  { value: 'standby', label: '备用' },
  { value: 'disabled', label: '停用' },
] as const;
const MODEL_STATUS_COLORS: Record<ModelProfile['status'], string> = {
  active: 'success',
  standby: 'processing',
  disabled: 'error',
};

const MODEL_COLUMNS: TableColumnsType<ModelProfile> = [
  {
    title: '提供方 / 模型',
    key: 'model',
    width: 240,
    render: (_, model) => (
      <Space direction="vertical" size={0}>
        <Typography.Text strong>{model.provider}</Typography.Text>
        <Typography.Text type="secondary">{model.model}</Typography.Text>
      </Space>
    ),
  },
  {
    title: '用途',
    dataIndex: 'purpose',
    width: 180,
    ellipsis: true,
  },
  {
    title: '策略',
    key: 'strategy',
    width: 180,
    render: (_, model) => (
      <Space size={COMPACT_TAG_GAP} wrap>
        <Tag>{BUDGET_LABELS[model.budget]}</Tag>
        <Tag color={model.schemaMode ? 'blue' : 'default'}>
          {model.schemaMode ? 'Schema' : '自由格式'}
        </Tag>
      </Space>
    ),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (_, model) => (
      <Tag color={MODEL_STATUS_COLORS[model.status]}>{STATUS_LABELS[model.status]}</Tag>
    ),
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: 180,
    render: (_, model) => (
      <Typography.Text type="secondary">
        <time dateTime={model.updatedAt}>{DATE_FORMATTER.format(new Date(model.updatedAt))}</time>
      </Typography.Text>
    ),
  },
];

export function ModelGovernance({ state }: { state: SectionState<ModelProfile[]> }) {
  return (
    <section className="admin-page" id="section-4" aria-labelledby="models-heading">
      <Card className="admin-dense-card admin-table-card" size="small">
        <div className="admin-page-heading">
          <div>
            <div className="eyebrow">Model Governance</div>
            <h2 id="models-heading">模型配置与用途边界</h2>
          </div>
          <p>仅管理员可查看模型路由、预算与 Schema 模式。</p>
        </div>
        {state.status === 'ready' ? (
          <ReadyModelTable models={state.data} />
        ) : (
          <SectionFeedback state={state} loadingMessage="正在加载模型配置" />
        )}
      </Card>
    </section>
  );
}

function ReadyModelTable({ models }: { models: ModelProfile[] }) {
  const table = useModelFilters(models);
  return (
    <>
      <AdminTableToolbar
        query={table.query}
        searchLabel="搜索提供方、模型或用途"
        resultLabel={`筛选出 ${table.pagination.total} 条`}
        filters={[table.statusFilter]}
        onQueryChange={table.changeQuery}
      />
      <ModelTable models={table.pagination.items} />
      <AdminPagination {...table.pagination} onChange={table.setPage} />
    </>
  );
}

function useModelFilters(models: ModelProfile[]) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ModelProfile['status'] | 'all'>('all');
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(
    () => filterModels(models, { query: deferredQuery, status }),
    [deferredQuery, models, status],
  );
  const changeStatus = (value: string) => {
    setStatus(value as ModelProfile['status'] | 'all');
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

function ModelTable({ models }: { models: ModelProfile[] }) {
  if (!models.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的记录" />;
  }
  return (
    <Table<ModelProfile>
      columns={MODEL_COLUMNS}
      dataSource={models}
      pagination={false}
      rowKey="id"
      scroll={{ x: 900 }}
      size="middle"
    />
  );
}
