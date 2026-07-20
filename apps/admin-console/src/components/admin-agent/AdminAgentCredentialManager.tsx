'use client';

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  StarFilled,
} from '@ant-design/icons';
import type { ModelCredentialView } from '@interview-agent/contracts';
import {
  Button,
  Empty,
  List,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import {
  deleteAdminModelCredential,
  listAdminModelCredentials,
  testAdminModelCredential,
  updateAdminModelCredential,
} from '@/lib/admin-page-agent-api';
import { ModelCredentialForm } from './ModelCredentialForm';

type Props = { open: boolean; onClose: () => void; onChanged: () => Promise<void> };
type CredentialEditor = ModelCredentialView | 'create' | null;
export const MODEL_CREDENTIAL_MANAGER_COPY = {
  title: '模型连接管理',
  hint: '密钥仅显示掩码；修改或轮换后需要重新测试。',
  create: '新增模型连接',
} as const;
type CredentialActionOptions = {
  credential: ModelCredentialView;
  setBusyId: (value: string | null) => void;
  completeChange: () => Promise<void>;
  action: () => Promise<unknown>;
  success: string;
};

export function AdminAgentCredentialManager({ open, onClose, onChanged }: Props) {
  const [credentials, setCredentials] = useState<ModelCredentialView[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editor, setEditor] = useState<CredentialEditor>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setCredentials(await listAdminModelCredentials());
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '模型连接列表加载失败。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  const completeChange = useCallback(async () => {
    await Promise.all([reload(), onChanged()]);
  }, [onChanged, reload]);

  return (
    <>
      <Modal
        destroyOnHidden
        footer={null}
        onCancel={onClose}
        open={open}
        title={MODEL_CREDENTIAL_MANAGER_COPY.title}
        width={720}
      >
        <ManagerToolbar
          loading={loading}
          onCreate={() => setEditor('create')}
          onReload={() => void reload()}
        />
        <CredentialList
          busyId={busyId}
          credentials={credentials}
          loading={loading}
          onDelete={(credential) => void deleteCredential(credential, setBusyId, completeChange)}
          onEdit={setEditor}
          onSetDefault={(credential) =>
            void setDefaultCredential(credential, setBusyId, completeChange)
          }
          onTest={(credential) => void testCredential(credential, setBusyId, completeChange)}
          onToggle={(credential) => void toggleCredential(credential, setBusyId, completeChange)}
        />
      </Modal>
      <ModelCredentialForm
        credential={editor === 'create' ? undefined : (editor ?? undefined)}
        onClose={() => setEditor(null)}
        onCompleted={completeChange}
        open={editor !== null}
      />
    </>
  );
}

function ManagerToolbar({
  loading,
  onCreate,
  onReload,
}: {
  loading: boolean;
  onCreate: () => void;
  onReload: () => void;
}) {
  return (
    <div className="admin-agent-credential-toolbar">
      <Typography.Text type="secondary">{MODEL_CREDENTIAL_MANAGER_COPY.hint}</Typography.Text>
      <Space>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={onReload}>
          刷新
        </Button>
        <Button icon={<PlusOutlined />} onClick={onCreate} type="primary">
          {MODEL_CREDENTIAL_MANAGER_COPY.create}
        </Button>
      </Space>
    </div>
  );
}

function CredentialList(props: CredentialListProps) {
  if (props.loading) return <Spin className="admin-agent-loading" />;
  if (!props.credentials.length)
    return (
      <Empty description="暂无模型连接">
        <Button onClick={() => props.onEdit('create')} type="primary">
          {MODEL_CREDENTIAL_MANAGER_COPY.create}
        </Button>
      </Empty>
    );
  return (
    <List
      className="admin-agent-credential-list"
      dataSource={props.credentials}
      renderItem={(credential) => <CredentialRow credential={credential} {...props} />}
    />
  );
}

type CredentialListProps = {
  credentials: ModelCredentialView[];
  loading: boolean;
  busyId: string | null;
  onEdit: (value: CredentialEditor) => void;
  onTest: (credential: ModelCredentialView) => void;
  onSetDefault: (credential: ModelCredentialView) => void;
  onToggle: (credential: ModelCredentialView) => void;
  onDelete: (credential: ModelCredentialView) => void;
};

function CredentialRow({
  credential,
  busyId,
  onEdit,
  onTest,
  onSetDefault,
  onToggle,
  onDelete,
}: CredentialListProps & { credential: ModelCredentialView }) {
  const busy = busyId === credential.id;
  return (
    <List.Item className="admin-agent-credential-item">
      <div className="admin-agent-credential-summary">
        <Space size={6} wrap>
          <Typography.Text strong>{credential.model}</Typography.Text>
          <Tag>{providerLabel(credential.provider)}</Tag>
          <StatusTag status={credential.status} />
          {credential.isDefault ? (
            <Tag color="gold" icon={<StarFilled />}>
              默认
            </Tag>
          ) : null}
        </Space>
        <Typography.Text type="secondary">
          {credential.baseUrl ?? '服务商默认端点'} · 密钥 {credential.keyHint} · 最近测试{' '}
          {formatDate(credential.lastTestedAt)}
        </Typography.Text>
        {credential.lastErrorCode ? (
          <Typography.Text type="danger">最近失败：{credential.lastErrorCode}</Typography.Text>
        ) : null}
      </div>
      <Space className="admin-agent-credential-actions" size={0} wrap>
        <Button
          disabled={busy}
          icon={<EditOutlined />}
          onClick={() => onEdit(credential)}
          size="small"
          type="link"
        >
          编辑
        </Button>
        <Button
          disabled={busy || credential.status === 'disabled'}
          icon={<ReloadOutlined />}
          loading={busy}
          onClick={() => onTest(credential)}
          size="small"
          type="link"
        >
          测试
        </Button>
        {!credential.isDefault ? (
          <Button
            disabled={busy || credential.status !== 'verified'}
            onClick={() => onSetDefault(credential)}
            size="small"
            type="link"
          >
            设为默认
          </Button>
        ) : null}
        <Button disabled={busy} onClick={() => onToggle(credential)} size="small" type="link">
          {credential.status === 'disabled' ? '启用' : '停用'}
        </Button>
        <Popconfirm
          description={
            credential.isDefault
              ? '删除后会自动切换到另一条已验证连接。'
              : '删除后无法恢复该模型连接。'
          }
          okText="删除连接"
          onConfirm={() => onDelete(credential)}
          title={`确认删除 ${credential.model}？`}
        >
          <Button danger disabled={busy} icon={<DeleteOutlined />} size="small" type="link">
            删除
          </Button>
        </Popconfirm>
      </Space>
    </List.Item>
  );
}

async function runCredentialAction({
  credential,
  setBusyId,
  completeChange,
  action,
  success,
}: CredentialActionOptions) {
  setBusyId(credential.id);
  try {
    await action();
    await completeChange();
    message.success(success);
  } catch (cause) {
    message.error(cause instanceof Error ? cause.message : '模型连接操作失败。');
  } finally {
    setBusyId(null);
  }
}

function testCredential(
  credential: ModelCredentialView,
  setBusyId: (value: string | null) => void,
  completeChange: () => Promise<void>,
) {
  return runCredentialAction({
    credential,
    setBusyId,
    completeChange,
    action: () => testAdminModelCredential(credential.id),
    success: '模型连接测试通过。',
  });
}

function setDefaultCredential(
  credential: ModelCredentialView,
  setBusyId: (value: string | null) => void,
  completeChange: () => Promise<void>,
) {
  return runCredentialAction({
    credential,
    setBusyId,
    completeChange,
    action: () => updateAdminModelCredential(credential.id, { isDefault: true }),
    success: '已设为默认模型。',
  });
}

function toggleCredential(
  credential: ModelCredentialView,
  setBusyId: (value: string | null) => void,
  completeChange: () => Promise<void>,
) {
  const status = credential.status === 'disabled' ? 'unverified' : 'disabled';
  const success = status === 'disabled' ? '模型连接已停用。' : '模型连接已启用，请重新测试。';
  return runCredentialAction({
    credential,
    setBusyId,
    completeChange,
    action: () => updateAdminModelCredential(credential.id, { status }),
    success,
  });
}

function deleteCredential(
  credential: ModelCredentialView,
  setBusyId: (value: string | null) => void,
  completeChange: () => Promise<void>,
) {
  return runCredentialAction({
    credential,
    setBusyId,
    completeChange,
    action: () => deleteAdminModelCredential(credential.id),
    success: '模型连接已删除。',
  });
}

function providerLabel(provider: ModelCredentialView['provider']) {
  const labels: Record<ModelCredentialView['provider'], string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    deepseek: 'DeepSeek',
    qwen: '通义千问',
    openai_compatible: '兼容端点',
  };
  return labels[provider];
}

function StatusTag({ status }: { status: ModelCredentialView['status'] }) {
  const labels = {
    unverified: ['待测试', 'default'],
    verified: ['已验证', 'success'],
    disabled: ['已停用', 'default'],
    failed: ['测试失败', 'error'],
  } as const;
  const [label, color] = labels[status];
  return <Tag color={color}>{label}</Tag>;
}

function formatDate(value: string | null) {
  if (!value) return '未测试';
  return new Date(value).toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
    day: 'numeric',
  });
}
