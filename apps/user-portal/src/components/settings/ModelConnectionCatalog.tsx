'use client';

import type { ModelCatalogState } from './model-catalog';
import type { ModelConnectionDraft } from './model-connection-form';

type UpdateDraft = (patch: Partial<ModelConnectionDraft>) => void;

export function ModelNameField({
  model,
  fetching,
  update,
  onFetch,
}: {
  model: string;
  fetching: boolean;
  update: UpdateDraft;
  onFetch: () => Promise<void>;
}) {
  return (
    <div className="label">
      <span>模型名称</span>
      <div className="settings-inline-field">
        <input
          className="input"
          aria-label="模型名称"
          value={model}
          onChange={(event) => update({ model: event.target.value })}
          placeholder="例如 deepseek-chat"
        />
        <button
          className="button secondary"
          type="button"
          onClick={() => void onFetch()}
          disabled={fetching}
        >
          {fetching ? '获取中…' : '获取模型'}
        </button>
      </div>
    </div>
  );
}

export function ModelCatalogResult({
  state,
  selected,
  onSelect,
  onDismiss,
}: {
  state: ModelCatalogState;
  selected: string;
  onSelect: (model: string) => void;
  onDismiss: () => void;
}) {
  if (state.kind === 'idle') return null;
  return (
    <div className="model-catalog" aria-live="polite">
      <ModelCatalogHeading state={state} onDismiss={onDismiss} />
      {state.kind === 'loading' ? (
        <p className="model-catalog-note">正在从模型服务读取可用模型…</p>
      ) : null}
      {state.kind === 'failed' ? <p className="settings-error">{state.message}</p> : null}
      {state.kind === 'ready' ? (
        <div className="model-catalog-list">
          {state.models.map((model) => (
            <button
              key={model.id}
              className="model-catalog-chip"
              type="button"
              title={model.label}
              data-selected={model.id === selected}
              onClick={() => onSelect(model.id)}
            >
              {model.id}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ModelCatalogHeading({
  state,
  onDismiss,
}: {
  state: ModelCatalogState;
  onDismiss: () => void;
}) {
  return (
    <div className="model-catalog-heading">
      <span>{catalogHeading(state)}</span>
      <button className="model-catalog-dismiss" type="button" onClick={onDismiss}>
        收起
      </button>
    </div>
  );
}

function catalogHeading(state: ModelCatalogState) {
  if (state.kind === 'ready') return `已获取 ${state.models.length} 个模型，点击即可填入模型名称`;
  if (state.kind === 'loading') return '正在获取模型列表';
  return '获取模型列表';
}
