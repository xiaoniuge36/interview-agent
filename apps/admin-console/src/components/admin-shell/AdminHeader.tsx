'use client';

import {
  DownOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  SettingOutlined,
  StarFilled,
  StarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '@interview-agent/auth-client';
import {
  Avatar,
  Breadcrumb,
  Button,
  Dropdown,
  Layout,
  Popover,
  Radio,
  Space,
  Tag,
  Typography,
  type MenuProps,
} from 'antd';
import { useState } from 'react';
import { getAdminNavigationItem, type AdminView } from '@/components/admin-navigation';
import { useAdminWorkspace } from '@/components/admin-workspace-context';
import { AdminCommandPalette } from './AdminCommandPalette';

const { Header } = Layout;
const TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', { timeStyle: 'medium' });

type AdminHeaderProps = {
  activeView: AdminView;
  collapsed: boolean;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  onRefresh: () => void;
  onToggleSidebar: () => void;
  onViewChange: (view: AdminView) => void;
};

export function AdminHeader(props: AdminHeaderProps) {
  const activeItem = getAdminNavigationItem(props.activeView);
  const auth = useAuth();
  return (
    <Header className="admin-layout-header" aria-busy={props.isRefreshing}>
      <div className="admin-header-context">
        <Button
          aria-label="切换侧栏"
          icon={props.collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          type="text"
          onClick={props.onToggleSidebar}
        />
        <div>
          <Breadcrumb items={[{ title: '治理控制台' }, { title: activeItem.label }]} />
          <Typography.Title level={4}>{activeItem.heading}</Typography.Title>
        </div>
      </div>
      <div className="admin-header-actions" role="toolbar" aria-label="后台快捷操作">
        <HeaderActions {...props} role={auth.identity?.role} />
      </div>
    </Header>
  );
}

function HeaderActions(props: AdminHeaderProps & { role: string | undefined }) {
  const workspace = useAdminWorkspace();
  const isFavorite = workspace.isFavorite(props.activeView);
  return (
    <>
      <div className="admin-header-discovery">
        <AdminCommandPalette role={props.role} onViewChange={props.onViewChange} />
      </div>
      <div className="admin-header-controls">
        <Button
          aria-label={isFavorite ? '取消收藏当前模块' : '收藏当前模块'}
          className="admin-header-favorite"
          icon={isFavorite ? <StarFilled /> : <StarOutlined />}
          type="text"
          onClick={() => workspace.toggleFavorite(props.activeView)}
        />
        <WorkspaceSettings />
        <RefreshSummary isRefreshing={props.isRefreshing} lastUpdatedAt={props.lastUpdatedAt} />
        <Button
          className="admin-header-refresh"
          icon={<ReloadOutlined />}
          loading={props.isRefreshing}
          onClick={props.onRefresh}
        >
          刷新
        </Button>
      </div>
      <SessionControl />
    </>
  );
}

function RefreshSummary(props: Pick<AdminHeaderProps, 'isRefreshing' | 'lastUpdatedAt'>) {
  return (
    <Typography.Text className="admin-refresh-summary" type="secondary">
      {props.isRefreshing ? '正在同步…' : formatUpdatedAt(props.lastUpdatedAt)}
    </Typography.Text>
  );
}

function WorkspaceSettings() {
  const workspace = useAdminWorkspace();
  return (
    <Popover
      content={
        <Space className="admin-workspace-settings" direction="vertical" size="middle">
          <SettingsChoice
            label="外观"
            options={[
              { label: '浅色', value: 'light' },
              { label: '深色', value: 'dark' },
            ]}
            value={workspace.preferences.appearance}
            onChange={(value) => workspace.setAppearance(value === 'dark' ? 'dark' : 'light')}
          />
          <SettingsChoice
            label="信息密度"
            options={[
              { label: '舒适', value: 'comfortable' },
              { label: '紧凑', value: 'compact' },
            ]}
            value={workspace.preferences.density}
            onChange={(value) =>
              workspace.setDensity(value === 'compact' ? 'compact' : 'comfortable')
            }
          />
        </Space>
      }
      title="工作台偏好"
      trigger="click"
    >
      <Button
        aria-label="工作台偏好"
        className="admin-header-settings"
        icon={<SettingOutlined />}
        type="text"
      />
    </Popover>
  );
}

function SettingsChoice({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <div>
      <Typography.Text strong>{label}</Typography.Text>
      <Radio.Group
        block
        optionType="button"
        options={options}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SessionControl() {
  const auth = useAuth();
  const [isSigningOut, setSigningOut] = useState(false);
  const displayName = auth.identity?.displayName ?? auth.identity?.subject ?? '管理员';
  if (auth.mode === 'development') return <Tag color="blue">开发身份</Tag>;
  const menu: MenuProps = {
    items: [{ key: 'sign-out', label: isSigningOut ? '退出中…' : '退出登录' }],
    onClick: () => void signOut(auth.signOut, setSigningOut),
  };
  return (
    <Dropdown menu={menu} trigger={['click']}>
      <Button className="admin-session-control" type="text">
        <Space size={6}>
          <Avatar icon={<UserOutlined />} size="small">
            {initial(displayName)}
          </Avatar>
          <span className="admin-session-label">{displayName}</span>
          <DownOutlined />
        </Space>
      </Button>
    </Dropdown>
  );
}

async function signOut(
  signOutAction: () => Promise<void>,
  setSigningOut: (value: boolean) => void,
) {
  setSigningOut(true);
  try {
    await signOutAction();
  } finally {
    setSigningOut(false);
  }
}

function formatUpdatedAt(value: string | null): string {
  return value ? `更新于 ${TIME_FORMATTER.format(new Date(value))}` : '等待首次加载';
}

function initial(value: string): string {
  return value.trim().slice(0, 1).toUpperCase() || 'A';
}
