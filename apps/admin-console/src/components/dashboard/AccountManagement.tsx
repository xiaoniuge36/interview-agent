'use client';

import { Card, Modal, Select, Typography } from 'antd';
import type { ManagedAccountRole } from '@interview-agent/contracts';
import React from 'react';
import { AdminPagination } from './AdminTableControls';
import { AccountDrawer } from './AccountDrawer';
import { AccountTable } from './AccountTable';
import { AccountToolbar } from './AccountToolbar';
import { ACCOUNT_ROLE_OPTIONS } from './account-management.types';
import { SectionFeedback } from './SectionState';
import { useAccountScreen } from './useAccountScreen';

type AccountManagementProps = { active: boolean; refreshKey: number; onChanged: () => void };

export function AccountManagement(props: AccountManagementProps) {
  const screen = useAccountScreen(props);
  return <AccountManagementLayout screen={screen} />;
}

function AccountManagementLayout({ screen }: { screen: ReturnType<typeof useAccountScreen> }) {
  return (
    <section className="admin-page" aria-labelledby="accounts-heading">
      <AccountManagementCard screen={screen} />
      <AccountDrawer
        accountId={screen.drawerAccountId}
        onChanged={screen.reload}
        onClose={() => screen.setDrawerAccountId(null)}
      />
      <RoleModal
        account={screen.role.account}
        isSaving={screen.role.isSaving}
        role={screen.role.role}
        onCancel={screen.role.close}
        onRoleChange={screen.role.setRole}
        onSave={() => void screen.role.save()}
      />
    </section>
  );
}

function AccountManagementCard({ screen }: { screen: ReturnType<typeof useAccountScreen> }) {
  const { list } = screen;
  return (
    <Card className="admin-dense-card admin-table-card" size="small">
      <div className="admin-page-heading">
        <div>
          <div className="eyebrow">Account Governance</div>
          <h2 id="accounts-heading">账号管理</h2>
        </div>
        <p>统一管理后台与用户端账号，变更会留下可追溯审计记录。</p>
      </div>
      <AccountToolbar
        draft={screen.draft}
        isLoading={list.status === 'loading'}
        onDraftChange={screen.setDraft}
        onExport={() => void screen.exportList()}
        onQuery={screen.query}
        onReset={screen.reset}
      />
      {list.status === 'ready' ? (
        <AccountTable
          accounts={list.data.items}
          onChangeStatus={screen.changeStatus}
          onOpenDrawer={screen.setDrawerAccountId}
          onOpenRole={screen.role.open}
        />
      ) : (
        <SectionFeedback state={list} loadingMessage="正在查询账号" />
      )}
      {list.status === 'ready' ? (
        <AdminPagination
          page={list.data.page}
          pageSize={list.data.pageSize}
          total={list.data.total}
          onChange={screen.setPage}
          onPageSizeChange={screen.setPageSize}
        />
      ) : null}
    </Card>
  );
}

function RoleModal(props: {
  account: unknown;
  isSaving: boolean;
  role: ManagedAccountRole;
  onCancel: () => void;
  onRoleChange: (role: ManagedAccountRole) => void;
  onSave: () => void;
}) {
  return (
    <Modal
      confirmLoading={props.isSaving}
      okText="确认变更"
      open={Boolean(props.account)}
      title="调整账号角色"
      onCancel={props.onCancel}
      onOk={props.onSave}
    >
      <Typography.Paragraph>角色变更会在该账号下一次受保护请求时生效。</Typography.Paragraph>
      <Select options={ACCOUNT_ROLE_OPTIONS} value={props.role} onChange={props.onRoleChange} />
    </Modal>
  );
}
