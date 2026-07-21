import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ModelCredentialView } from '@interview-agent/contracts';
import { Button, Empty, List, Modal, Space, Spin, Typography } from 'antd';
import { CredentialRow } from './CredentialRow';
import type { CredentialEditor } from './model-credential-manager.types';

export const MODEL_CREDENTIAL_MANAGER_COPY = {
  title: '模型连接管理',
  hint: '密钥仅显示掩码；修改或轮换后需要重新测试。',
  create: '新增模型连接',
} as const;

type Props = {
  busyId: string | null;
  credentials: ModelCredentialView[];
  loading: boolean;
  onClose: () => void;
  onCreate: () => void;
  onDelete: (credential: ModelCredentialView) => void;
  onEdit: (editor: CredentialEditor) => void;
  onReload: () => void;
  onSetDefault: (credential: ModelCredentialView) => void;
  onTest: (credential: ModelCredentialView) => void;
  onToggle: (credential: ModelCredentialView) => void;
  open: boolean;
};

export function CredentialManagerDialog(props: Props) {
  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={props.onClose}
      open={props.open}
      title={MODEL_CREDENTIAL_MANAGER_COPY.title}
      width={720}
    >
      <ManagerToolbar loading={props.loading} onCreate={props.onCreate} onReload={props.onReload} />
      <CredentialList {...props} />
    </Modal>
  );
}

function ManagerToolbar({
  loading,
  onCreate,
  onReload,
}: Pick<Props, 'loading' | 'onCreate' | 'onReload'>) {
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

function CredentialList(props: Props) {
  if (props.loading) return <Spin className="admin-agent-loading" />;
  if (!props.credentials.length)
    return (
      <Empty description="暂无模型连接">
        <Button onClick={props.onCreate} type="primary">
          {MODEL_CREDENTIAL_MANAGER_COPY.create}
        </Button>
      </Empty>
    );
  return (
    <List
      className="admin-agent-credential-list"
      dataSource={props.credentials}
      renderItem={(credential) => (
        <CredentialRow
          busyId={props.busyId}
          credential={credential}
          onDelete={props.onDelete}
          onEdit={props.onEdit}
          onSetDefault={props.onSetDefault}
          onTest={props.onTest}
          onToggle={props.onToggle}
        />
      )}
    />
  );
}
