'use client';

import { CloudDownloadOutlined } from '@ant-design/icons';
import type { AvailableModel } from '@interview-agent/contracts';
import type { FormInstance } from 'antd';
import { Button, Select, Space, Typography } from 'antd';
import { useState } from 'react';
import { discoverAdminAvailableModels } from '@/lib/admin-page-agent-api';
import {
  modelCatalogBlocker,
  toModelCatalogInput,
  type ModelCredentialFormValues,
} from './model-credential-form-model';

type CatalogState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; models: AvailableModel[] }
  | { kind: 'failed'; message: string };

type Props = {
  credentialId: string | null;
  form: FormInstance<ModelCredentialFormValues>;
  model: string;
  onSelect: (model: string) => void;
};

/** 在后台表单里读取服务商的模型目录，选中后直接写入模型名称。 */
export function ModelCatalogPicker({ credentialId, form, model, onSelect }: Props) {
  const [state, setState] = useState<CatalogState>({ kind: 'idle' });
  const fetchModels = async () => {
    const blocked = modelCatalogBlocker(form.getFieldsValue(), credentialId);
    if (blocked) {
      setState({ kind: 'failed', message: blocked });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const models = await discoverAdminAvailableModels(
        toModelCatalogInput(form.getFieldsValue(), credentialId),
      );
      setState(models.length ? { kind: 'ready', models } : emptyCatalog());
    } catch (cause) {
      setState({ kind: 'failed', message: messageOf(cause) });
    }
  };
  return (
    <Space direction="vertical" size={8} style={{ display: 'flex' }}>
      <FetchButton state={state} onFetch={fetchModels} />
      <CatalogFeedback state={state} />
      {state.kind === 'ready' ? (
        <Select
          optionFilterProp="label"
          options={state.models.map(toOption)}
          placeholder="从获取到的模型中选择"
          showSearch
          style={{ width: '100%' }}
          value={state.models.some((item) => item.id === model) ? model : null}
          onChange={onSelect}
        />
      ) : null}
    </Space>
  );
}

function FetchButton({ state, onFetch }: { state: CatalogState; onFetch: () => Promise<void> }) {
  return (
    <Space>
      <Button
        icon={<CloudDownloadOutlined />}
        loading={state.kind === 'loading'}
        onClick={() => void onFetch()}
      >
        {state.kind === 'loading' ? '获取中…' : '获取模型'}
      </Button>
      <Typography.Text type="secondary">用当前填写的服务商与密钥读取可用模型。</Typography.Text>
    </Space>
  );
}

function CatalogFeedback({ state }: { state: CatalogState }) {
  if (state.kind === 'failed')
    return <Typography.Text type="danger">{state.message}</Typography.Text>;
  if (state.kind === 'ready') {
    return (
      <Typography.Text type="secondary">
        已获取 {state.models.length} 个模型，选择后即填入模型名称。
      </Typography.Text>
    );
  }
  return null;
}

function toOption(model: AvailableModel) {
  return {
    value: model.id,
    label: model.label === model.id ? model.id : `${model.id} · ${model.label}`,
  };
}

function emptyCatalog(): CatalogState {
  return { kind: 'failed', message: '服务商没有返回可用模型，请稍后重试或手动填写模型名称。' };
}

function messageOf(cause: unknown) {
  return cause instanceof Error ? cause.message : '获取模型列表失败，请稍后重试。';
}
