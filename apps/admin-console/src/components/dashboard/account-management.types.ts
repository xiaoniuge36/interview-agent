import type { AccountView, ManagedAccountRole } from '@interview-agent/contracts';
import type { AccountPage, AccountQueryInput } from '@/lib/account-api';
import type { AdminApiError } from '@/lib/api';

export const INITIAL_ACCOUNT_QUERY: AccountQueryInput = { page: 1, pageSize: 20 };

export const ACCOUNT_ROLE_OPTIONS: {
  label: string;
  value: ManagedAccountRole;
  description: string;
}[] = [
  { label: '用户端用户', value: 'user', description: '使用训练、练习与面试功能。' },
  { label: '内容审核员', value: 'question_reviewer', description: '处理导入资料与候选题审核。' },
  { label: '租户管理员', value: 'admin', description: '治理本租户的内容、模型和运行记录。' },
  { label: '平台管理员', value: 'platform_admin', description: '管理全站账号与平台运营数据。' },
  { label: '客服支持', value: 'support', description: '处理受限的运营支持任务。' },
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

export function roleOption(role: ManagedAccountRole) {
  const option = ACCOUNT_ROLE_OPTIONS.find((item) => item.value === role);
  if (option) return option;
  throw new Error(`Unknown managed account role: ${role}`);
}
