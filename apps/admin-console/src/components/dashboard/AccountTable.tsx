'use client';

import { Button, Popconfirm, Space, Table, Tag, Typography, type TableColumnsType } from 'antd';
import type { AccountView } from '@interview-agent/contracts';
import React from 'react';

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
      scroll={{ x: 1260 }}
      size="middle"
    />
  );
}

function accountColumns(props: AccountTableProps): TableColumnsType<AccountView> {
  return [
    accountIdentityColumn(),
    accountKindColumn(),
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
    width: 200,
    render: (_: unknown, account: AccountView) => (
      <>
        <Typography.Text strong>{account.name ?? account.subject}</Typography.Text>
        <Typography.Text type="secondary">{account.email ?? account.subject}</Typography.Text>
      </>
    ),
  };
}

function accountKindColumn() {
  return {
    title: '类型 / 角色',
    key: 'kind',
    width: 170,
    render: (_: unknown, account: AccountView) =>
      `${account.kind === 'admin' ? '后台' : '用户端'} / ${account.role}`,
  };
}

function accountStatusColumn() {
  return {
    title: '状态',
    dataIndex: 'status',
    width: 90,
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
    render: (value: AccountView['authSource']) => (value === 'local' ? '本地' : 'OIDC'),
  };
}

function accountTenantColumn() {
  return {
    title: '所属租户',
    key: 'tenant',
    width: 180,
    render: (_: unknown, account: AccountView) => account.tenant.name,
  };
}

function timeColumn(title: string, key: 'lastSignedInAt' | 'createdAt') {
  return { title, dataIndex: key, width: 170, render: formatTime };
}

function accountActionsColumn(props: AccountTableProps) {
  return {
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
    width: 220,
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
      <Button type="link" onClick={() => props.onOpenRole(account)}>
        改角色
      </Button>
      <Popconfirm
        description="操作将立即影响下一次受保护请求。"
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
