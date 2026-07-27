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
  StarFilled,
  TeamOutlined,
} from '@ant-design/icons';
import { useAuth } from '@interview-agent/auth-client';
import { Button, Menu, Typography, type MenuProps } from 'antd';
import type { ReactNode } from 'react';
import {
  ADMIN_NAV_GROUPS,
  canAccessAdminView,
  isAdminView,
  type AdminNavigationItem,
  type AdminView,
} from '@/components/admin-navigation';
import { useAdminWorkspace } from '@/components/admin-workspace-context';

type AdminSidebarProps = {
  activeView: AdminView;
  collapsed: boolean;
  onToggle: () => void;
  onViewChange: (view: AdminView) => void;
};

export function AdminSidebar(props: AdminSidebarProps) {
  const auth = useAuth();
  const { preferences } = useAdminWorkspace();
  const navigationGroups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessAdminView(auth.identity?.role, item.id)),
  })).filter((group) => group.items.length > 0);
  const favorites = preferences.favorites
    .map((view) => navigationItem(view))
    .filter((item): item is AdminNavigationItem => Boolean(item))
    .filter((item) => canAccessAdminView(auth.identity?.role, item.id));
  const groups: SidebarGroup[] = favorites.length
    ? [{ id: 'favorites', label: '我的工作台', items: favorites }, ...navigationGroups]
    : navigationGroups;
  return (
    <aside className="admin-sidebar" aria-label="管理后台侧栏">
      <SidebarBrand collapsed={props.collapsed} onViewChange={props.onViewChange} />
      <Menu
        className="admin-sidebar-menu"
        items={menuItems(groups)}
        mode="inline"
        selectedKeys={[selectedMenuKey(props.activeView, favorites)]}
        theme="dark"
        onClick={({ key }) => props.onViewChange(viewFromMenuKey(key))}
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

type SidebarGroup = { id: string; label: string; items: readonly AdminNavigationItem[] };

function menuItems(groups: readonly SidebarGroup[]): NonNullable<MenuProps['items']> {
  return groups.map((group) => ({
    key: group.id,
    type: 'group',
    label: group.label,
    children: group.items.map((item) => ({
      key: menuKey(group.id, item.id),
      icon: group.id === 'favorites' ? <StarFilled /> : navigationIcon(item.id),
      label: item.label,
      title: `${item.label} · ${item.helper}`,
    })),
  }));
}

function navigationItem(view: AdminView): AdminNavigationItem | undefined {
  return ADMIN_NAV_GROUPS.flatMap((group) => group.items).find((item) => item.id === view);
}

function selectedMenuKey(activeView: AdminView, favorites: readonly AdminNavigationItem[]) {
  return favorites.some((item) => item.id === activeView)
    ? menuKey('favorites', activeView)
    : activeView;
}

function menuKey(groupId: string, view: AdminView) {
  return groupId === 'favorites' ? `favorite:${view}` : view;
}

function viewFromMenuKey(key: string): AdminView {
  const value = key.replace(/^favorite:/, '');
  return isAdminView(value) ? value : 'overview';
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
