import type { ModelProfile } from '@interview-agent/contracts';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { SectionFeedback } from './SectionState';

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

export function ModelGovernance({ state }: { state: SectionState<ModelProfile[]> }) {
  return (
    <section id="section-3" className="card" aria-labelledby="models-heading">
      <div className="section-heading compact-heading">
        <div>
          <div className="eyebrow">Model Governance</div>
          <h2 id="models-heading">模型配置与用途边界</h2>
        </div>
        <p>仅管理员可查看模型路由、预算与 Schema 模式。</p>
      </div>
      {state.status === 'ready' ? (
        <ModelTable models={state.data} />
      ) : (
        <SectionFeedback state={state} loadingMessage="正在加载模型配置" />
      )}
    </section>
  );
}

function ModelTable({ models }: { models: ModelProfile[] }) {
  if (!models.length) return <div className="empty-state">暂无模型配置。</div>;
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
