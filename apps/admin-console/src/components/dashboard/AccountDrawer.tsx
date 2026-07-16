'use client';

import { App, Button, Descriptions, Divider, Form, Input, Spin, Table, Typography } from 'antd';
import type { AccountDetail } from '@interview-agent/contracts';
import React, { useEffect, useState } from 'react';
import { getAccountDetail, resetLocalPassword } from '@/lib/account-api';
import { AdminDrawer } from './AdminDrawer';

type AccountDrawerProps = {
  accountId: string | null;
  onChanged: () => void;
  onClose: () => void;
};

export function AccountDrawer(props: AccountDrawerProps) {
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [isLoading, setLoading] = useState(false);
  useEffect(() => {
    if (!props.accountId) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void getAccountDetail(props.accountId, controller.signal)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [props.accountId]);
  return (
    <AdminDrawer
      description="查看账号身份、登录状态与治理审计记录。"
      open={Boolean(props.accountId)}
      title={detail?.name ?? detail?.email ?? '账号详情'}
      onClose={props.onClose}
    >
      {isLoading ? <Spin /> : null}
      {detail ? <AccountDrawerContent detail={detail} onChanged={props.onChanged} /> : null}
    </AdminDrawer>
  );
}

function AccountDrawerContent({
  detail,
  onChanged,
}: {
  detail: AccountDetail;
  onChanged: () => void;
}) {
  return (
    <>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="账号">{detail.name ?? detail.subject}</Descriptions.Item>
        <Descriptions.Item label="邮箱">{detail.email ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="所属租户">{detail.tenant.name}</Descriptions.Item>
        <Descriptions.Item label="角色 / 状态">{`${detail.role} / ${detail.status}`}</Descriptions.Item>
        <Descriptions.Item label="认证来源">
          {detail.authSource === 'local' ? '本地账号' : 'OIDC / 外部身份'}
        </Descriptions.Item>
        <Descriptions.Item label="最近登录">{formatTime(detail.lastSignedInAt)}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{formatTime(detail.createdAt)}</Descriptions.Item>
      </Descriptions>
      {detail.authSource === 'local' ? (
        <PasswordReset accountId={detail.id} onChanged={onChanged} />
      ) : null}
      <Divider />
      <Typography.Title level={5}>最近治理审计</Typography.Title>
      <Table
        columns={AUDIT_COLUMNS}
        dataSource={detail.auditLogs}
        locale={{ emptyText: '暂无账号治理记录' }}
        pagination={false}
        rowKey="id"
        size="small"
      />
    </>
  );
}

function PasswordReset({ accountId, onChanged }: { accountId: string; onChanged: () => void }) {
  const [form] = Form.useForm<{ password: string }>();
  const [isSaving, setSaving] = useState(false);
  const { message } = App.useApp();
  const submit = async ({ password }: { password: string }) => {
    setSaving(true);
    try {
      await resetLocalPassword(accountId, { password });
      form.resetFields();
      message.success('本地密码已重置');
      onChanged();
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  };
  return (
    <Form form={form} layout="vertical" onFinish={submit}>
      <Divider />
      <Typography.Title level={5}>重置本地密码</Typography.Title>
      <Form.Item
        label="新密码"
        name="password"
        rules={[{ required: true, message: '请输入新密码' }]}
      >
        <Input.Password autoComplete="new-password" />
      </Form.Item>
      <Form.Item>
        <Button htmlType="submit" loading={isSaving}>
          重置密码
        </Button>
      </Form.Item>
    </Form>
  );
}

const AUDIT_COLUMNS = [
  { title: '动作', dataIndex: 'action' },
  { title: '结果', dataIndex: 'result' },
  { title: '时间', dataIndex: 'createdAt', render: formatTime },
];

function formatTime(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—';
}
