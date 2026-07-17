'use client';

import { App } from 'antd';
import type { CreateLocalAdminInput, TenantOption } from '@interview-agent/contracts';
import { useState } from 'react';
import { createLocalAdmin, getAccountTenantOptions } from '@/lib/account-api';

type CreateLocalAdminState = {
  isOpen: boolean;
  isSaving: boolean;
  isTenantsLoading: boolean;
  tenants: TenantOption[];
};

const INITIAL_STATE: CreateLocalAdminState = {
  isOpen: false,
  isSaving: false,
  isTenantsLoading: false,
  tenants: [],
};

export function useCreateLocalAdmin(reload: () => void) {
  const { message } = App.useApp();
  const [state, setState] = useState<CreateLocalAdminState>(INITIAL_STATE);

  const open = async () => {
    setState({ ...INITIAL_STATE, isOpen: true, isTenantsLoading: true });
    try {
      const tenants = await getAccountTenantOptions();
      setState((current) => ({ ...current, isTenantsLoading: false, tenants }));
    } catch {
      setState((current) => ({ ...current, isTenantsLoading: false }));
    }
  };

  const submit = async (input: CreateLocalAdminInput) => {
    setState((current) => ({ ...current, isSaving: true }));
    try {
      await createLocalAdmin(input);
      message.success('管理员账号已创建。');
      setState(INITIAL_STATE);
      reload();
    } catch {
      setState((current) => ({ ...current, isSaving: false }));
    }
  };

  return {
    ...state,
    close: () => setState(INITIAL_STATE),
    open,
    submit,
  };
}
