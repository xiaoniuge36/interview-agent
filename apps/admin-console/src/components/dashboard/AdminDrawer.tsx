'use client';

import { Drawer, Typography } from 'antd';
import type { ReactNode } from 'react';

type AdminDrawerProps = {
  children: ReactNode;
  description?: string;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function isDrawerCloseKey(key: string): boolean {
  return key === 'Escape';
}

export function AdminDrawer(props: AdminDrawerProps) {
  return (
    <Drawer
      destroyOnHidden
      keyboard={isDrawerCloseKey('Escape')}
      open={props.open}
      size="large"
      title={<DrawerTitle description={props.description} title={props.title} />}
      onClose={props.onClose}
    >
      {props.children}
    </Drawer>
  );
}

type DrawerTitleProps = {
  description?: string | undefined;
  title: string;
};

function DrawerTitle({ description, title }: DrawerTitleProps) {
  return (
    <div className="admin-drawer-title">
      <div>{title}</div>
      {description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}
    </div>
  );
}
