import type { ModelProfile } from '@interview-agent/contracts';
import { Card, Empty, Space, Table, Tag, Typography, type TableColumnsType } from 'antd';
import { useAdminListExport } from '@/hooks/useAdminListExport';
import { useAdminPagedList, type AdminPagedListController } from '@/hooks/useAdminPagedList';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { SectionFeedback } from './SectionState';

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

export function ModelGovernance({ active, refreshKey }: { active: boolean; refreshKey: number }) {
  const list = useAdminPagedList('model-profiles', { enabled: active, reloadKey: refreshKey });
  const { exportList, isExporting } = useAdminListExport('model-profiles', list.submittedQuery);
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
        <ModelListContent exportList={exportList} isExporting={isExporting} list={list} />
      </Card>
    </section>
  );
}

type ModelListContentProps = {
  exportList: () => Promise<void>;
  isExporting: boolean;
  list: AdminPagedListController<'model-profiles'>;
};

function ModelListContent({ exportList, isExporting, list }: ModelListContentProps) {
  if (list.state.status !== 'ready')
    return <SectionFeedback state={list.state} loadingMessage="正在加载模型配置" />;
  const page = list.state.data;
  return (
    <>
      <ModelToolbar
        exportList={exportList}
        isExporting={isExporting}
        list={list}
        total={page.total}
      />
      <ModelTable models={page.items} />
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

type ModelToolbarProps = ModelListContentProps & { total: number };

function ModelToolbar({ exportList, isExporting, list, total }: ModelToolbarProps) {
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
              status: value === 'all' ? undefined : (value as ModelProfile['status']),
            })),
        },
      ]}
      isExporting={isExporting}
      isLoading={list.isLoading}
      query={list.draftQuery.keyword ?? ''}
      resultLabel={`共 ${total} 条`}
      searchLabel="搜索提供方、模型或用途"
      onExport={() => void exportList()}
      onQuery={list.query}
      onQueryChange={(keyword) => list.setDraftQuery((current) => ({ ...current, keyword }))}
      onReset={list.reset}
    />
  );
}

function ModelTable({ models }: { models: ModelProfile[] }) {
  if (!models.length)
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的记录" />;
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
  { title: '用途', dataIndex: 'purpose', width: 180, ellipsis: true },
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
