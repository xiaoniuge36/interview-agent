'use client';

import { UserAddOutlined } from '@ant-design/icons';
import { Avatar, Button, Card, Modal, Select, Statistic, Tag, Typography } from 'antd';
import type { AccountView, ManagedAccountRole } from '@interview-agent/contracts';
import React from 'react';
import { AdminPagination } from './AdminTableControls';
import { AccountDrawer } from './AccountDrawer';
import { AccountTable } from './AccountTable';
import { AccountToolbar } from './AccountToolbar';
import { CreateLocalAdminModal } from './CreateLocalAdminModal';
import { ACCOUNT_ROLE_OPTIONS, roleOption } from './account-management.types';
import { summarizeAccounts } from './account-management-model';
import { SectionFeedback } from './SectionState';
import { useAccountScreen } from './useAccountScreen';

type AccountManagementProps = { active: boolean; refreshKey: number; onChanged: () => void };

export function AccountManagement(props: AccountManagementProps) {
  const screen = useAccountScreen(props);
  return <AccountManagementLayout screen={screen} />;
}

function AccountManagementLayout({ screen }: { screen: ReturnType<typeof useAccountScreen> }) {
  return (
    <section className="admin-page account-governance-page" aria-labelledby="accounts-heading">
      <AccountManagementCard screen={screen} />
      <AccountDrawer
        accountId={screen.drawerAccountId}
        onChanged={screen.reload}
        onClose={() => screen.setDrawerAccountId(null)}
      />
      <AccountRoleModal
        account={screen.role.account}
        isSaving={screen.role.isSaving}
        role={screen.role.role}
        onCancel={screen.role.close}
        onRoleChange={screen.role.setRole}
        onSave={() => void screen.role.save()}
      />
      <CreateLocalAdminModal
        isOpen={screen.creation.isOpen}
        isSaving={screen.creation.isSaving}
        isTenantsLoading={screen.creation.isTenantsLoading}
        tenants={screen.creation.tenants}
        onCancel={screen.creation.close}
        onSubmit={(input) => void screen.creation.submit(input)}
      />
    </section>
  );
}

function AccountManagementCard({ screen }: { screen: ReturnType<typeof useAccountScreen> }) {
  const { list } = screen;
  const page = list.status === 'ready' ? list.data : null;
  return (
    <Card className="admin-dense-card admin-table-card account-governance-card" size="small">
      <AccountPageHeading total={page?.total ?? 0} onCreate={() => void screen.creation.open()} />
      {page ? <AccountSummary accounts={page.items} total={page.total} /> : null}
      <AccountToolbar
        draft={screen.draft}
        isLoading={list.status === 'loading'}
        onDraftChange={screen.setDraft}
        onExport={() => void screen.exportList()}
        onQuery={screen.query}
        onReset={screen.reset}
      />
      {page ? (
        <AccountTable
          accounts={page.items}
          onChangeStatus={screen.changeStatus}
          onOpenDrawer={screen.setDrawerAccountId}
          onOpenRole={screen.role.open}
        />
      ) : (
        <SectionFeedback state={list} loadingMessage="正在查询账号" />
      )}
      {page ? (
        <AdminPagination
          page={page.page}
          pageSize={page.pageSize}
          total={page.total}
          onChange={screen.setPage}
          onPageSizeChange={screen.setPageSize}
        />
      ) : null}
    </Card>
  );
}

function AccountPageHeading({ total, onCreate }: { total: number; onCreate: () => void }) {
  return (
    <div className="admin-page-heading account-page-heading">
      <div>
        <div className="eyebrow">Account Governance</div>
        <h2 id="accounts-heading">账号管理</h2>
      </div>
      <div>
        <Typography.Text type="secondary">
          统一管理后台与用户端账号，所有变更都会保留可追溯审计记录。
        </Typography.Text>
        <Tag className="account-match-tag">当前筛选匹配 {total} 个账号</Tag>
        <Button icon={<UserAddOutlined />} type="primary" onClick={onCreate}>
          新增管理员
        </Button>
      </div>
    </div>
  );
}

function AccountSummary({ accounts, total }: { accounts: AccountView[]; total: number }) {
  const summary = summarizeAccounts(accounts);
  return (
    <div className="account-summary" aria-label="当前页账号摘要">
      <Statistic title="匹配账号" value={total} />
      <Statistic title="当前页启用" value={summary.active} />
      <Statistic title="当前页禁用" value={summary.disabled} />
      <Statistic title="当前页后台账号" value={summary.admin} />
    </div>
  );
}

export function AccountRoleModal(props: {
  account: AccountView | null;
  isSaving: boolean;
  role: ManagedAccountRole;
  onCancel: () => void;
  onRoleChange: (role: ManagedAccountRole) => void;
  onSave: () => void;
}) {
  const selected = roleOption(props.role);
  return (
    <Modal
      confirmLoading={props.isSaving}
      okText="确认变更"
      open={Boolean(props.account)}
      title="调整账号角色"
      width={560}
      onCancel={props.onCancel}
      onOk={props.onSave}
    >
      {props.account ? <AccountRoleContext account={props.account} /> : null}
      <Typography.Paragraph>角色变更会在该账号下一次受保护请求时生效。</Typography.Paragraph>
      <Typography.Text strong>选择新角色</Typography.Text>
      <Select
        className="account-role-select"
        options={ACCOUNT_ROLE_OPTIONS}
        popupMatchSelectWidth
        value={props.role}
        onChange={props.onRoleChange}
      />
      <div className="account-role-description">
        <Typography.Text strong>{selected.label}</Typography.Text>
        <Typography.Text type="secondary">{selected.description}</Typography.Text>
      </div>
    </Modal>
  );
}

function AccountRoleContext({ account }: { account: AccountView }) {
  return (
    <div className="account-role-context">
      <Avatar size={40}>{accountInitial(account)}</Avatar>
      <div>
        <Typography.Text strong>{account.name ?? account.subject}</Typography.Text>
        <Typography.Text type="secondary">{account.email ?? account.subject}</Typography.Text>
      </div>
    </div>
  );
}

function accountInitial(account: AccountView) {
  return (account.name ?? account.email ?? account.subject).trim().slice(0, 1).toUpperCase();
}
