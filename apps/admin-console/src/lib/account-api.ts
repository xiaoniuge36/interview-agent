import {
  AccountDetailSchema,
  AccountListQuerySchema,
  AccountViewSchema,
  AdminPageSchema,
  ResetLocalPasswordInputSchema,
  UpdateAccountRoleInputSchema,
  UpdateAccountStatusInputSchema,
  type AccountDetail,
  type AccountListQuery,
  type AccountView,
  type ResetLocalPasswordInput,
  type UpdateAccountRoleInput,
  type UpdateAccountStatusInput,
} from '@interview-agent/contracts';
import { z } from 'zod';
import {
  adminDownload,
  adminRequest,
  type AdminApiBlobRequest,
  type AdminApiRequest,
  type AdminDownloadedFile,
} from './api';

type PaginationFields = 'page' | 'pageSize';
export type AccountQueryInput = Omit<AccountListQuery, PaginationFields> &
  Partial<Pick<AccountListQuery, PaginationFields>>;
export type AccountPage = { items: AccountView[]; total: number; page: number; pageSize: number };

const AccountPageSchema = AdminPageSchema(AccountViewSchema);
const AccountMutationResultSchema = z.object({ id: z.string().min(1) });

export function createAccountQueryRequest(
  input: AccountQueryInput = {},
): AdminApiRequest<AccountPage> {
  return { path: accountPath('query', input, true), schema: AccountPageSchema };
}

export function createAccountExportRequest(input: AccountQueryInput = {}): AdminApiBlobRequest {
  return { path: accountPath('export', input, false), fallbackFileName: 'accounts.csv' };
}

export function createAccountDetailRequest(accountId: string): AdminApiRequest<AccountDetail> {
  return { path: `/admin/accounts/${encodeURIComponent(accountId)}`, schema: AccountDetailSchema };
}

export function createUpdateAccountRoleRequest(
  accountId: string,
  input: UpdateAccountRoleInput,
): AdminApiRequest<AccountView> {
  return mutationRequest(
    `/admin/accounts/${encodeURIComponent(accountId)}/role`,
    UpdateAccountRoleInputSchema.parse(input),
    AccountViewSchema,
  );
}

export function createUpdateAccountStatusRequest(
  accountId: string,
  input: UpdateAccountStatusInput,
): AdminApiRequest<AccountView> {
  return mutationRequest(
    `/admin/accounts/${encodeURIComponent(accountId)}/status`,
    UpdateAccountStatusInputSchema.parse(input),
    AccountViewSchema,
  );
}

export function createResetLocalPasswordRequest(
  accountId: string,
  input: ResetLocalPasswordInput,
): AdminApiRequest<{ id: string }> {
  return mutationRequest(
    `/admin/accounts/${encodeURIComponent(accountId)}/local-password`,
    ResetLocalPasswordInputSchema.parse(input),
    AccountMutationResultSchema,
  );
}

export function queryAccounts(input: AccountQueryInput, signal?: AbortSignal) {
  const request = createAccountQueryRequest(input);
  return adminRequest({ ...request, ...(signal ? { init: { signal } } : {}) });
}

export function exportAccounts(input: AccountQueryInput): Promise<AdminDownloadedFile> {
  return adminDownload(createAccountExportRequest(input));
}

export function getAccountDetail(accountId: string, signal?: AbortSignal) {
  const request = createAccountDetailRequest(accountId);
  return adminRequest({ ...request, ...(signal ? { init: { signal } } : {}) });
}

export function updateAccountRole(accountId: string, input: UpdateAccountRoleInput) {
  return adminRequest(createUpdateAccountRoleRequest(accountId, input));
}

export function updateAccountStatus(accountId: string, input: UpdateAccountStatusInput) {
  return adminRequest(createUpdateAccountStatusRequest(accountId, input));
}

export function resetLocalPassword(accountId: string, input: ResetLocalPasswordInput) {
  return adminRequest(createResetLocalPasswordRequest(accountId, input));
}

function accountPath(
  action: 'query' | 'export',
  input: AccountQueryInput,
  includePagination: boolean,
) {
  const query = AccountListQuerySchema.parse(input);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '' || (!includePagination && isPaginationField(key)))
      continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return `/admin/accounts/${action}${search ? `?${search}` : ''}`;
}

function mutationRequest<Input extends object, Output>(
  path: string,
  input: Input,
  schema: import('zod').ZodType<Output>,
): AdminApiRequest<Output> {
  return { path, schema, init: { method: 'PATCH', body: JSON.stringify(input) } };
}

function isPaginationField(value: string) {
  return value === 'page' || value === 'pageSize';
}
