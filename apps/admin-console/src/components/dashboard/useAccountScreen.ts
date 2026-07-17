'use client';

import { App } from 'antd';
import type { AccountView, ManagedAccountRole } from '@interview-agent/contracts';
import { useCallback, useState } from 'react';
import {
  exportAccounts,
  updateAccountRole,
  updateAccountStatus,
  type AccountQueryInput,
} from '@/lib/account-api';
import { saveAdminDownloadedFile } from '@/lib/admin-list-api';
import { INITIAL_ACCOUNT_QUERY, type RoleModalState } from './account-management.types';
import { useCreateLocalAdmin } from './useCreateLocalAdmin';
import { useAccountList } from './useAccountList';

type ScreenOptions = { active: boolean; refreshKey: number; onChanged: () => void };

export function useAccountScreen(options: ScreenOptions) {
  const queries = useAccountQueries(options);
  const creation = useCreateLocalAdmin(queries.reload);
  const role = useRoleMutation(queries.reload);
  const changeStatus = useStatusMutation(queries.reload);
  const [drawerAccountId, setDrawerAccountId] = useState<string | null>(null);
  return { ...queries, changeStatus, creation, drawerAccountId, role, setDrawerAccountId };
}

function useAccountQueries(options: ScreenOptions) {
  const [draft, setDraft] = useState<AccountQueryInput>(INITIAL_ACCOUNT_QUERY);
  const [submitted, setSubmitted] = useState<AccountQueryInput>(INITIAL_ACCOUNT_QUERY);
  const [requestKey, setRequestKey] = useState(0);
  const { message } = App.useApp();
  const list = useAccountList(options.active, submitted, options.refreshKey + requestKey);
  const reload = useCallback(() => {
    setRequestKey((value) => value + 1);
    options.onChanged();
  }, [options]);
  const exportList = async () => {
    try {
      const file = await exportAccounts(submitted);
      saveAdminDownloadedFile(file);
      message.success(`已开始导出 ${file.fileName}`);
    } catch {
      return;
    }
  };
  return {
    draft,
    exportList,
    list,
    reload,
    setDraft,
    setPage: (page: number) => setSubmitted((current) => ({ ...current, page })),
    setPageSize: (pageSize: number) =>
      setSubmitted((current) => ({ ...current, page: 1, pageSize })),
    query: () => {
      setSubmitted({ ...draft, page: 1 });
      setRequestKey((value) => value + 1);
    },
    reset: () => {
      setDraft(INITIAL_ACCOUNT_QUERY);
      setSubmitted(INITIAL_ACCOUNT_QUERY);
      setRequestKey((value) => value + 1);
    },
  };
}

function useStatusMutation(reload: () => void) {
  const { message } = App.useApp();
  return async (account: AccountView) => {
    try {
      const status = account.status === 'active' ? 'disabled' : 'active';
      await updateAccountStatus(account.id, { status });
      message.success(status === 'disabled' ? '账号已停用' : '账号已启用');
      reload();
    } catch {
      return;
    }
  };
}

function useRoleMutation(reload: () => void) {
  const { message } = App.useApp();
  const [state, setState] = useState<RoleModalState>({
    account: null,
    isSaving: false,
    role: 'user',
  });
  const open = (account: AccountView) => setState({ account, isSaving: false, role: account.role });
  const save = async () => {
    if (!state.account) return;
    setState((current) => ({ ...current, isSaving: true }));
    try {
      await updateAccountRole(state.account.id, { role: state.role });
      message.success('账号角色已更新');
      setState({ account: null, isSaving: false, role: 'user' });
      reload();
    } catch {
      setState((current) => ({ ...current, isSaving: false }));
    }
  };
  return {
    ...state,
    close: () => setState((current) => ({ ...current, account: null })),
    open,
    save,
    setRole: (role: ManagedAccountRole) => setState((current) => ({ ...current, role })),
  };
}
