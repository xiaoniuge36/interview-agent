import type { ModelProfile } from '@interview-agent/contracts';
import { useDeferredValue, useMemo, useState } from 'react';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { filterModels, paginateRecords } from './admin-records';
import { SectionFeedback } from './SectionState';

const PAGE_SIZE = 8;
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

export function ModelGovernance({ state }: { state: SectionState<ModelProfile[]> }) {
  return (
    <section id="section-4" className="card" aria-labelledby="models-heading">
      <div className="section-heading compact-heading">
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
  if (!models.length) return <div className="empty-state compact-empty">没有匹配的模型配置。</div>;
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="visually-hidden">模型治理配置列表</caption>
        <thead>
          <tr>
            <th scope="col">提供方 / 模型</th>
            <th scope="col">用途</th>
            <th scope="col">策略</th>
            <th scope="col">状态</th>
            <th scope="col">更新时间</th>
          </tr>
        </thead>
        <tbody>
          {models.map((model) => (
            <ModelRow key={model.id} model={model} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModelRow({ model }: { model: ModelProfile }) {
  return (
    <tr>
      <td>
        <strong>{model.provider}</strong>
        <span>{model.model}</span>
      </td>
      <td>{model.purpose}</td>
      <td>
        {BUDGET_LABELS[model.budget]} · {model.schemaMode ? 'Schema' : '自由格式'}
      </td>
      <td>
        <span className={model.status === 'disabled' ? 'status danger' : 'status'}>
          {STATUS_LABELS[model.status]}
        </span>
      </td>
      <td>
        <time dateTime={model.updatedAt}>{DATE_FORMATTER.format(new Date(model.updatedAt))}</time>
      </td>
    </tr>
  );
}
