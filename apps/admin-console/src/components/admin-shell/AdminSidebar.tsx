'use client';

import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  HddOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RadarChartOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useAuth } from '@interview-agent/auth-client';
import { Button, Menu, Typography, type MenuProps } from 'antd';
import type { ReactNode } from 'react';
import {
  ADMIN_NAV_GROUPS,
  canAccessAdminView,
  type AdminView,
} from '@/components/admin-navigation';

type AdminSidebarProps = {
  activeView: AdminView;
  collapsed: boolean;
  onToggle: () => void;
  onViewChange: (view: AdminView) => void;
};

export function AdminSidebar(props: AdminSidebarProps) {
  const auth = useAuth();
  const groups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessAdminView(auth.identity?.role, item.id)),
  })).filter((group) => group.items.length > 0);
  return (
    <aside className="admin-sidebar" aria-label="管理后台侧栏">
      <SidebarBrand collapsed={props.collapsed} onViewChange={props.onViewChange} />
      <Menu
        className="admin-sidebar-menu"
        items={menuItems(groups)}
        mode="inline"
        selectedKeys={[props.activeView]}
        theme="dark"
        onClick={({ key }) => props.onViewChange(key as AdminView)}
      />
      <SidebarFooter collapsed={props.collapsed} onToggle={props.onToggle} />
    </aside>
  );
}

function SidebarBrand({
  collapsed,
  onViewChange,
}: Pick<AdminSidebarProps, 'collapsed' | 'onViewChange'>) {
  return (
    <Button
      className="admin-sidebar-brand"
      icon={<AppstoreOutlined />}
      type="text"
      onClick={() => onViewChange('overview')}
    >
      {collapsed ? null : <span>Interview Agent</span>}
    </Button>
  );
}

function SidebarFooter({ collapsed, onToggle }: Pick<AdminSidebarProps, 'collapsed' | 'onToggle'>) {
  return (
    <div className="admin-sidebar-footer">
      <Button
        block
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        type="text"
        onClick={onToggle}
      >
        {collapsed ? null : '收起菜单'}
      </Button>
      {collapsed ? null : (
        <Typography.Text className="admin-sidebar-rule" type="secondary">
          先审核，再发布
        </Typography.Text>
      )}
    </div>
  );
}

function menuItems(groups: typeof ADMIN_NAV_GROUPS): NonNullable<MenuProps['items']> {
  return groups.map((group) => ({
    key: group.id,
    type: 'group',
    label: group.label,
    children: group.items.map((item) => ({
      key: item.id,
      icon: navigationIcon(item.id),
      label: item.label,
      title: `${item.label} · ${item.helper}`,
    })),
  }));
}

function navigationIcon(view: AdminView): ReactNode {
  return {
    overview: <AppstoreOutlined />,
    analytics: <BarChartOutlined />,
    imports: <CloudUploadOutlined />,
    questions: <DatabaseOutlined />,
    content: <FileSearchOutlined />,
    models: <HddOutlined />,
    runtime: <RadarChartOutlined />,
    audit: <AuditOutlined />,
    accounts: <TeamOutlined />,
  }[view];
}
