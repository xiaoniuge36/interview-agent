'use client';

import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Collapse, Form, Input, Select, Space } from 'antd';
import React from 'react';
import type { AccountQueryInput } from '@/lib/account-api';
import { ACCOUNT_ROLE_OPTIONS } from './account-management.types';

type AccountToolbarProps = {
  draft: AccountQueryInput;
  isLoading: boolean;
  onDraftChange: (next: AccountQueryInput) => void;
  onExport: () => void;
  onQuery: () => void;
  onReset: () => void;
};

const TYPE_OPTIONS = [
  { label: '后台账号', value: 'admin' },
  { label: '用户端账号', value: 'user' },
];
const STATUS_OPTIONS = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'disabled' },
];
const SOURCE_OPTIONS = [
  { label: '本地', value: 'local' },
  { label: 'OIDC', value: 'oidc' },
];

export function AccountToolbar(props: AccountToolbarProps) {
  const update = (changes: Partial<AccountQueryInput>) =>
    props.onDraftChange({ ...props.draft, ...changes });
  return (
    <Form className="account-governance-toolbar" layout="vertical" onFinish={props.onQuery}>
      <div className="account-toolbar-primary">
        <AccountTextFilter
          label="搜索账号"
          placeholder="姓名、邮箱或账号主体"
          value={props.draft.keyword}
          onChange={(keyword) => update({ keyword })}
        />
        <ToolbarActions {...props} />
      </div>
      <Collapse
        className="account-advanced-filters"
        ghost
        items={[
          {
            key: 'advanced',
            label: '高级筛选',
            children: <AccountFilters draft={props.draft} onChange={update} />,
          },
        ]}
      />
    </Form>
  );
}

function AccountFilters(props: {
  draft: AccountQueryInput;
  onChange: (changes: Partial<AccountQueryInput>) => void;
}) {
  return (
    <div className="account-advanced-filter-fields">
      <AccountTextFilter
        label="租户"
        placeholder="租户名称或标识"
        value={props.draft.tenantKeyword}
        onChange={(tenantKeyword) => props.onChange({ tenantKeyword })}
      />
      <AccountSelect
        label="类型"
        options={TYPE_OPTIONS}
        value={props.draft.kind}
        onChange={(kind) => props.onChange({ kind: kind as AccountQueryInput['kind'] })}
      />
      <AccountSelect
        label="角色"
        options={ACCOUNT_ROLE_OPTIONS}
        value={props.draft.role}
        onChange={(role) => props.onChange({ role: role as AccountQueryInput['role'] })}
      />
      <AccountSelect
        label="状态"
        options={STATUS_OPTIONS}
        value={props.draft.status}
        onChange={(status) => props.onChange({ status: status as AccountQueryInput['status'] })}
      />
      <AccountSelect
        label="来源"
        options={SOURCE_OPTIONS}
        value={props.draft.authSource}
        onChange={(authSource) =>
          props.onChange({ authSource: authSource as AccountQueryInput['authSource'] })
        }
      />
    </div>
  );
}

function AccountTextFilter(props: {
  label: string;
  placeholder: string;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <Form.Item label={props.label}>
      <Input
        allowClear
        placeholder={props.placeholder}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </Form.Item>
  );
}

function AccountSelect(props: {
  label: string;
  options: { label: string; value: string }[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Form.Item label={props.label}>
      <Select allowClear options={props.options} value={props.value} onChange={props.onChange} />
    </Form.Item>
  );
}

function ToolbarActions(props: Pick<AccountToolbarProps, 'isLoading' | 'onExport' | 'onReset'>) {
  return (
    <Space className="account-toolbar-actions" size={8} wrap>
      <Button htmlType="submit" icon={<SearchOutlined />} loading={props.isLoading} type="primary">
        查询
      </Button>
      <Button disabled={props.isLoading} icon={<ReloadOutlined />} onClick={props.onReset}>
        重置
      </Button>
      <Button disabled={props.isLoading} icon={<DownloadOutlined />} onClick={props.onExport}>
        导出
      </Button>
    </Space>
  );
}
