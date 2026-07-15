'use client';

import {
  DownOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '@interview-agent/auth-client';
import {
  AutoComplete,
  Avatar,
  Breadcrumb,
  Button,
  Dropdown,
  Input,
  Layout,
  Space,
  Tag,
  Typography,
  type MenuProps,
} from 'antd';
import { useMemo, useState } from 'react';
import { ADMIN_NAV_ITEMS, getAdminNavigationItem, type AdminView } from '@/components/admin-navigation';

const { Header } = Layout;
const MAX_SEARCH_RESULTS = 5;
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
      <Space className="admin-header-actions" size="middle">
        <HeaderSearch onViewChange={props.onViewChange} />
        <RefreshSummary isRefreshing={props.isRefreshing} lastUpdatedAt={props.lastUpdatedAt} />
        <Button icon={<ReloadOutlined />} loading={props.isRefreshing} onClick={props.onRefresh}>
          刷新
        </Button>
        <SessionControl />
      </Space>
    </Header>
  );
}

function HeaderSearch({ onViewChange }: Pick<AdminHeaderProps, 'onViewChange'>) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => findNavigationMatches(query), [query]);
  return (
    <AutoComplete
      className="admin-header-search"
      options={matches.map((item) => ({ value: item.id, label: `${item.label} · ${item.helper}` }))}
      value={query}
      onChange={setQuery}
      onSelect={(value) => {
        onViewChange(value as AdminView);
        setQuery('');
      }}
    >
      <Input allowClear prefix={<SearchOutlined />} placeholder="搜索功能 / 模块" />
    </AutoComplete>
  );
}

function RefreshSummary(props: Pick<AdminHeaderProps, 'isRefreshing' | 'lastUpdatedAt'>) {
  return (
    <Typography.Text className="admin-refresh-summary" type="secondary">
      {props.isRefreshing ? '正在同步…' : formatUpdatedAt(props.lastUpdatedAt)}
    </Typography.Text>
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
      <Button type="text">
        <Space size={6}>
          <Avatar icon={<UserOutlined />} size="small">
            {initial(displayName)}
          </Avatar>
          <span>{displayName}</span>
          <DownOutlined />
        </Space>
      </Button>
    </Dropdown>
  );
}

function findNavigationMatches(query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return [];
  return ADMIN_NAV_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(keyword) ||
      item.helper.toLowerCase().includes(keyword) ||
      item.heading.toLowerCase().includes(keyword),
  ).slice(0, MAX_SEARCH_RESULTS);
}

async function signOut(signOutAction: () => Promise<void>, setSigningOut: (value: boolean) => void) {
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
