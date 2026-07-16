import type { AccountView, ManagedAccountRole } from '@interview-agent/contracts';
import type { AccountPage, AccountQueryInput } from '@/lib/account-api';
import type { AdminApiError } from '@/lib/api';

export const INITIAL_ACCOUNT_QUERY: AccountQueryInput = { page: 1, pageSize: 20 };
export const ACCOUNT_ROLE_OPTIONS: { label: string; value: ManagedAccountRole }[] = [
  { label: '用户', value: 'user' },
  { label: '审核员', value: 'question_reviewer' },
  { label: '管理员', value: 'admin' },
  { label: '平台管理员', value: 'platform_admin' },
  { label: '客服', value: 'support' },
];

export type AccountListState =
  | { status: 'loading' }
  | { status: 'ready'; data: AccountPage }
  | { status: 'forbidden'; access: 'platform-only' }
  | { status: 'error'; error: AdminApiError };

export type RoleModalState = {
  account: AccountView | null;
  isSaving: boolean;
  role: ManagedAccountRole;
};
