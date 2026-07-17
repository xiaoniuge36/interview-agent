'use client';

import { MoreOutlined } from '@ant-design/icons';
import {
  Avatar,
  Button,
  Dropdown,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';
import type { AccountView } from '@interview-agent/contracts';
import React from 'react';
import { roleOption } from './account-management.types';

type AccountTableProps = {
  accounts: AccountView[];
  onChangeStatus: (account: AccountView) => Promise<void>;
  onOpenDrawer: (accountId: string) => void;
  onOpenRole: (account: AccountView) => void;
};

const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' });

export function AccountTable(props: AccountTableProps) {
  return (
    <Table
      columns={accountColumns(props)}
      dataSource={props.accounts}
      locale={{ emptyText: '没有匹配的账号' }}
      pagination={false}
      rowKey="id"
      scroll={{ x: 1120 }}
      size="middle"
    />
  );
}

function accountColumns(props: AccountTableProps): TableColumnsType<AccountView> {
  return [
    accountIdentityColumn(),
    accountRoleColumn(),
    accountStatusColumn(),
    accountSourceColumn(),
    accountTenantColumn(),
    timeColumn('最近登录', 'lastSignedInAt'),
    timeColumn('创建时间', 'createdAt'),
    accountActionsColumn(props),
  ];
}

function accountIdentityColumn() {
  return {
    title: '账号',
    key: 'account',
    width: 250,
    render: (_: unknown, account: AccountView) => <AccountIdentity account={account} />,
  };
}

function AccountIdentity({ account }: { account: AccountView }) {
  const primary = account.name ?? account.subject;
  return (
    <div className="account-identity">
      <Avatar className="account-avatar">{primary.slice(0, 1).toUpperCase()}</Avatar>
      <div>
        <Typography.Text strong>{primary}</Typography.Text>
        <Typography.Text type="secondary">{account.email ?? account.subject}</Typography.Text>
      </div>
    </div>
  );
}

function accountRoleColumn() {
  return {
    title: '账号类型 / 角色',
    key: 'role',
    width: 190,
    render: (_: unknown, account: AccountView) => (
      <div className="account-role-cell">
        <Tag color={account.kind === 'admin' ? 'blue' : 'default'}>
          {account.kind === 'admin' ? '后台账号' : '用户端账号'}
        </Tag>
        <Typography.Text>{roleOption(account.role).label}</Typography.Text>
      </div>
    ),
  };
}

function accountStatusColumn() {
  return {
    title: '状态',
    dataIndex: 'status',
    width: 92,
    render: (value: AccountView['status']) => (
      <Tag color={value === 'active' ? 'success' : 'error'}>
        {value === 'active' ? '启用' : '停用'}
      </Tag>
    ),
  };
}

function accountSourceColumn() {
  return {
    title: '来源',
    dataIndex: 'authSource',
    width: 100,
    render: (value: AccountView['authSource']) => (
      <Tag className="account-source-tag">{value === 'local' ? '本地账号' : 'OIDC'}</Tag>
    ),
  };
}

function accountTenantColumn() {
  return {
    title: '所属租户',
    key: 'tenant',
    width: 190,
    render: (_: unknown, account: AccountView) => (
      <Typography.Text ellipsis={{ tooltip: account.tenant.name }}>
        {account.tenant.name}
      </Typography.Text>
    ),
  };
}

function timeColumn(title: string, key: 'lastSignedInAt' | 'createdAt') {
  return { title, dataIndex: key, width: 158, render: formatTime };
}

function accountActionsColumn(props: AccountTableProps) {
  return {
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
    width: 188,
    render: (_: unknown, account: AccountView) => <AccountActions account={account} {...props} />,
  };
}

function AccountActions(props: AccountTableProps & { account: AccountView }) {
  const { account } = props;
  return (
    <Space size={0} wrap>
      <Button type="link" onClick={() => props.onOpenDrawer(account.id)}>
        详情
      </Button>
      <Dropdown
        menu={{
          items: [{ key: 'role', label: '调整角色' }],
          onClick: () => props.onOpenRole(account),
        }}
        trigger={['click']}
      >
        <Button icon={<MoreOutlined />} type="link">
          更多
        </Button>
      </Dropdown>
      <Popconfirm
        description="操作会在该账号下一次受保护请求时生效。"
        okText="确认"
        title={account.status === 'active' ? '确认停用该账号？' : '确认启用该账号？'}
        onConfirm={() => props.onChangeStatus(account)}
      >
        <Button danger={account.status === 'active'} type="link">
          {account.status === 'active' ? '停用' : '启用'}
        </Button>
      </Popconfirm>
    </Space>
  );
}

function formatTime(value: string | null): string {
  return value ? DATE_FORMATTER.format(new Date(value)) : '—';
}
