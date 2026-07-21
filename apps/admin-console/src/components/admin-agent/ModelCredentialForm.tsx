'use client';

import type { ModelCredentialView, ModelProvider } from '@interview-agent/contracts';
import { Form, Input, Modal, Select, Space, Switch, Typography, message } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  createAdminModelCredential,
  testAdminModelCredential,
  updateAdminModelCredential,
} from '@/lib/admin-page-agent-api';
import {
  credentialFormInitialValues,
  toCredentialCreateInput,
  toCredentialUpdateInput,
  type ModelCredentialFormValues,
} from './model-credential-form-model';

const PROVIDER_OPTIONS = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: '通义千问', value: 'qwen' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'OpenAI 兼容端点', value: 'openai_compatible' },
];

type Props = {
  credential?: ModelCredentialView | undefined;
  open: boolean;
  onClose: () => void;
  onCompleted: () => Promise<void>;
};

type SaveCredentialOptions = {
  values: ModelCredentialFormValues;
  credential?: ModelCredentialView | undefined;
  onCompleted: () => Promise<void>;
  onClose: () => void;
  setSaving: (value: boolean) => void;
  setError: (value: string | null) => void;
};

export function ModelCredentialForm({ credential, open, onClose, onCompleted }: Props) {
  const [form] = Form.useForm<ModelCredentialFormValues>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const provider = Form.useWatch('provider', form) ?? 'openai_compatible';

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(credentialFormInitialValues(credential));
    setError(null);
  }, [credential, form, open]);

  return (
    <Modal
      destroyOnHidden
      okButtonProps={{ loading: saving }}
      okText={credential ? '保存并测试' : '新增并测试'}
      onCancel={onClose}
      onOk={() => void form.submit()}
      open={open}
      title={credential ? `编辑 ${credential.model}` : '新增模型连接'}
    >
      <CredentialForm
        credential={credential}
        error={error}
        form={form}
        onSubmit={(values) =>
          void saveCredential({ values, credential, onCompleted, onClose, setSaving, setError })
        }
        provider={provider}
      />
    </Modal>
  );
}

function CredentialForm({
  credential,
  error,
  form,
  onSubmit,
  provider,
}: {
  credential?: ModelCredentialView | undefined;
  error: string | null;
  form: ReturnType<typeof Form.useForm<ModelCredentialFormValues>>[0];
  onSubmit: (values: ModelCredentialFormValues) => void;
  provider: ModelProvider;
}) {
  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      <CredentialSecurityNotice />
      <CredentialFields
        credential={credential}
        form={form}
        onSubmit={onSubmit}
        provider={provider}
      />
      {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
    </Space>
  );
}

function CredentialSecurityNotice() {
  return (
    <Typography.Paragraph type="secondary">
      API Key 仅在保存或轮换时提交到 Product API 加密保存，不会回显、写入浏览器存储或发送给 Agent。
    </Typography.Paragraph>
  );
}

function CredentialFields({
  credential,
  form,
  onSubmit,
  provider,
}: Omit<Parameters<typeof CredentialForm>[0], 'error'>) {
  return (
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item
        label="模型服务商"
        name="provider"
        rules={[{ required: true, message: '请选择服务商' }]}
      >
        <Select options={PROVIDER_OPTIONS} />
      </Form.Item>
      <Form.Item
        label="模型名称"
        name="model"
        rules={[{ required: true, message: '请输入模型名称' }]}
      >
        <Input placeholder="例如：zai-org/GLM-5.2 或 gpt-4.1-mini" />
      </Form.Item>
      {provider === 'openai_compatible' ? <BaseUrlField /> : null}
      <Form.Item
        label={credential ? 'API Key（留空则不修改）' : 'API Key'}
        name="apiKey"
        rules={credential ? [] : [{ required: true, min: 8, message: '请输入有效 API Key' }]}
      >
        <Input.Password
          autoComplete="new-password"
          placeholder={credential ? '仅在轮换密钥时填写' : '仅提交到后端加密保存'}
        />
      </Form.Item>
      <Form.Item label="设为默认模型" name="isDefault" valuePropName="checked">
        <Switch />
      </Form.Item>
    </Form>
  );
}

function BaseUrlField() {
  return (
    <Form.Item
      label="兼容端点 Base URL"
      name="baseUrl"
      rules={[
        { required: true, message: '请输入 HTTPS 端点' },
        { type: 'url', message: '请输入有效 URL' },
        { pattern: /^https:\/\//, message: '端点必须使用 HTTPS' },
      ]}
    >
      <Input placeholder="https://your-provider.example.com/v1" />
    </Form.Item>
  );
}

async function saveCredential({
  values,
  credential,
  onCompleted,
  onClose,
  setSaving,
  setError,
}: SaveCredentialOptions) {
  setSaving(true);
  setError(null);
  try {
    const saved = credential
      ? await updateExistingCredential(values, credential)
      : await createAdminModelCredential(toCredentialCreateInput(values));
    await testCredential(saved.id, onCompleted);
    await onCompleted();
    message.success('模型连接已保存并测试通过。');
    onClose();
  } catch (cause) {
    setError(cause instanceof Error ? cause.message : '模型连接保存失败，请检查配置。');
  } finally {
    setSaving(false);
  }
}

async function testCredential(credentialId: string, onCompleted: () => Promise<void>) {
  try {
    await testAdminModelCredential(credentialId);
  } catch (error) {
    await onCompleted();
    throw error;
  }
}

function updateExistingCredential(
  values: ModelCredentialFormValues,
  credential: ModelCredentialView,
) {
  const input = toCredentialUpdateInput(values, credential);
  if (!input) return Promise.resolve(credential);
  return updateAdminModelCredential(credential.id, input);
}
