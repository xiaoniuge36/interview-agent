import { DeleteOutlined, EditOutlined, ReloadOutlined, StarFilled } from '@ant-design/icons';
import type { ModelCredentialView } from '@interview-agent/contracts';
import { Button, List, Popconfirm, Space, Tag, Typography } from 'antd';

type Props = {
  busyId: string | null;
  credential: ModelCredentialView;
  onDelete: (credential: ModelCredentialView) => void;
  onEdit: (credential: ModelCredentialView) => void;
  onSetDefault: (credential: ModelCredentialView) => void;
  onTest: (credential: ModelCredentialView) => void;
  onToggle: (credential: ModelCredentialView) => void;
};

export function CredentialRow(props: Props) {
  const busy = props.busyId === props.credential.id;
  return (
    <List.Item className="admin-agent-credential-item">
      <CredentialSummary credential={props.credential} />
      <CredentialRowActions busy={busy} {...props} />
    </List.Item>
  );
}

function CredentialSummary({ credential }: { credential: ModelCredentialView }) {
  return (
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
  );
}

function CredentialRowActions(props: Props & { busy: boolean }) {
  const { busy, credential } = props;
  return (
    <Space className="admin-agent-credential-actions" size={0} wrap>
      <TextAction disabled={busy} icon={<EditOutlined />} onClick={() => props.onEdit(credential)}>
        编辑
      </TextAction>
      <TextAction
        disabled={busy || credential.status === 'disabled'}
        icon={<ReloadOutlined />}
        loading={busy}
        onClick={() => props.onTest(credential)}
      >
        测试
      </TextAction>
      {!credential.isDefault ? (
        <TextAction
          disabled={busy || credential.status !== 'verified'}
          onClick={() => props.onSetDefault(credential)}
        >
          设为默认
        </TextAction>
      ) : null}
      <TextAction disabled={busy} onClick={() => props.onToggle(credential)}>
        {credential.status === 'disabled' ? '启用' : '停用'}
      </TextAction>
      <CredentialDeleteAction busy={busy} credential={credential} onDelete={props.onDelete} />
    </Space>
  );
}

function TextAction({ children, ...props }: Parameters<typeof Button>[0]) {
  return (
    <Button {...props} size="small" type="link">
      {children}
    </Button>
  );
}

function CredentialDeleteAction({
  busy,
  credential,
  onDelete,
}: Pick<Props, 'credential' | 'onDelete'> & { busy: boolean }) {
  return (
    <Popconfirm
      description={
        credential.isDefault ? '删除后会自动切换到另一条已验证连接。' : '删除后无法恢复该模型连接。'
      }
      okText="删除连接"
      onConfirm={() => onDelete(credential)}
      title={`确认删除 ${credential.model}？`}
    >
      <Button danger disabled={busy} icon={<DeleteOutlined />} size="small" type="link">
        删除
      </Button>
    </Popconfirm>
  );
}

function providerLabel(provider: ModelCredentialView['provider']) {
  return {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    deepseek: 'DeepSeek',
    qwen: '通义千问',
    openai_compatible: '兼容端点',
  }[provider];
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
