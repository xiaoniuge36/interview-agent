'use client';

import { SettingOutlined } from '@ant-design/icons';
import { Button, Drawer, Space, Tag } from 'antd';
import { useEffect } from 'react';
import {
  resolveAgentDrawerPresentation,
  syncAdminAgentDrawerPresence,
  useCompactAgentDrawer,
} from './agent-drawer-presentation';
import {
  AdminAgentDrawerContent,
  type AdminAgentDrawerContentProps,
} from './AdminAgentDrawerContent';

export { AdminAgentDrawerContent } from './AdminAgentDrawerContent';

type Props = AdminAgentDrawerContentProps & {
  open: boolean;
  onClose: () => void;
};

export function AdminAgentDrawer(props: Props) {
  const presentation = resolveAgentDrawerPresentation(useCompactAgentDrawer());
  useEffect(() => syncAdminAgentDrawerPresence(document.documentElement, props.open), [props.open]);
  return (
    <Drawer
      className="admin-agent-drawer"
      destroyOnClose={false}
      extra={<DrawerExtra model={props.config?.model} onSetup={props.onSetup} />}
      mask={presentation.mask}
      maskClosable={presentation.maskClosable}
      onClose={props.onClose}
      open={props.open}
      title="智能运营助手"
      size="large"
    >
      <AdminAgentDrawerContent {...props} />
    </Drawer>
  );
}

function DrawerExtra({
  model,
  onSetup,
}: {
  model: string | null | undefined;
  onSetup: () => void;
}) {
  return (
    <Space size={6}>
      {model ? <Tag color="blue">{model}</Tag> : null}
      <Button aria-label="设置模型连接" icon={<SettingOutlined />} type="text" onClick={onSetup} />
    </Space>
  );
}
