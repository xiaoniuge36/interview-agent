import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  AccountViewSchema,
  AdminPageSchema,
  AuditLogViewSchema,
  type AccountListQuery,
  type AccountView,
} from '@interview-agent/contracts';

const ADMIN_ROLES = ['platform_admin', 'admin', 'question_reviewer', 'support'] as const;
const PLATFORM_ROLE = 'platform_admin';

export const ACCOUNT_INCLUDE = {
  tenant: { select: { id: true, name: true, slug: true } },
  credential: { select: { id: true } },
} as const;
export const AccountPageSchema = AdminPageSchema(AccountViewSchema);

export type AccountRow = {
  id: string;
  tenantId: string;
  subject: string;
  role: string;
  status: string;
  name: string | null;
  email: string | null;
  disabledAt: Date | null;
  disabledByUserId: string | null;
  lastSignedInAt: Date | null;
  createdAt: Date;
  tenant: { id: string; name: string; slug: string };
  credential: { id: string } | null;
};

export type PlatformAdminMutation = {
  account: Pick<AccountRow, 'id' | 'role' | 'status'>;
  nextRole: string;
  nextStatus: string;
};

export function accountWhere(query: AccountListQuery): Prisma.UserWhereInput {
  const filters: Prisma.UserWhereInput[] = [{ role: { not: 'agent_runtime' } }];
  appendKindFilter(filters, query);
  appendStatusFilters(filters, query);
  appendSearchFilters(filters, query);
  appendDateFilter(filters, query);
  return filters.length === 1 ? (filters[0] ?? {}) : { AND: filters };
}

export function mapAccount(record: AccountRow): AccountView {
  return AccountViewSchema.parse({
    id: record.id,
    subject: record.subject,
    name: record.name,
    email: record.email,
    role: record.role,
    status: record.status,
    kind: record.role === 'user' ? 'user' : 'admin',
    authSource: record.credential ? 'local' : 'oidc',
    tenant: record.tenant,
    lastSignedInAt: record.lastSignedInAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  });
}

export function mapAuditLog(record: {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorId: string;
  actorRole: string;
  traceId: string;
  result: string;
  createdAt: Date;
}) {
  return AuditLogViewSchema.parse({ ...record, createdAt: record.createdAt.toISOString() });
}

export async function assertPlatformAdminRemains(
  transaction: Prisma.TransactionClient,
  mutation: PlatformAdminMutation,
) {
  if (!removesActivePlatformAdmin(mutation)) return;
  const remaining = await transaction.user.count({
    where: { id: { not: mutation.account.id }, role: PLATFORM_ROLE, status: 'active' },
  });
  if (remaining === 0) throw lastPlatformAdminProtected();
}

export function accountNotFound() {
  return new NotFoundException({ code: 'ACCOUNT_NOT_FOUND', message: '账号不存在。' });
}

export function targetTenantNotFound() {
  return new NotFoundException({
    code: 'ACCOUNT_TARGET_TENANT_NOT_FOUND',
    message: '目标租户不存在。',
  });
}

export function accountEmailExists() {
  return new ConflictException({
    code: 'ACCOUNT_EMAIL_EXISTS',
    message: '该邮箱已绑定本地账号。',
  });
}

export function selfMutationForbidden() {
  return new ForbiddenException({
    code: 'ACCOUNT_SELF_MUTATION_FORBIDDEN',
    message: '不能停用或降级当前账号。',
  });
}

export function localCredentialRequired() {
  return new BadRequestException({
    code: 'ACCOUNT_LOCAL_CREDENTIAL_REQUIRED',
    message: '该账号由外部身份提供方管理，无法在后台重置密码。',
  });
}

function appendKindFilter(filters: Prisma.UserWhereInput[], query: AccountListQuery) {
  if (query.kind === 'admin') filters.push({ role: { in: [...ADMIN_ROLES] } });
  if (query.kind === 'user') filters.push({ role: 'user' });
}

function appendStatusFilters(filters: Prisma.UserWhereInput[], query: AccountListQuery) {
  if (query.role) filters.push({ role: query.role });
  if (query.status) filters.push({ status: query.status });
  if (query.authSource === 'local') filters.push({ credential: { isNot: null } });
  if (query.authSource === 'oidc') filters.push({ credential: null });
}

function appendSearchFilters(filters: Prisma.UserWhereInput[], query: AccountListQuery) {
  if (query.tenantKeyword) {
    filters.push({ tenant: { is: { OR: textSearch(query.tenantKeyword, ['name', 'slug']) } } });
  }
  if (query.keyword) filters.push({ OR: textSearch(query.keyword, ['name', 'email', 'subject']) });
}

function appendDateFilter(filters: Prisma.UserWhereInput[], query: AccountListQuery) {
  if (!query.createdFrom && !query.createdTo) return;
  filters.push({
    createdAt: {
      ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
      ...(query.createdTo ? { lte: new Date(query.createdTo) } : {}),
    },
  });
}

function removesActivePlatformAdmin(mutation: PlatformAdminMutation) {
  return (
    mutation.account.role === PLATFORM_ROLE &&
    mutation.account.status === 'active' &&
    (mutation.nextRole !== PLATFORM_ROLE || mutation.nextStatus !== 'active')
  );
}

function lastPlatformAdminProtected() {
  return new ConflictException({
    code: 'PLATFORM_ADMIN_LAST_MEMBER_PROTECTED',
    message: '至少需要保留一个启用的平台管理员。',
  });
}

function textSearch(keyword: string, fields: string[]) {
  return fields.map((field) => ({ [field]: { contains: keyword, mode: 'insensitive' as const } }));
}
