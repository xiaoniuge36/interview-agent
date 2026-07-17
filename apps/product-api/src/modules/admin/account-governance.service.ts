import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AccountDetailSchema,
  TenantOptionSchema,
  type CreateLocalAdminInput,
  type AccountDetail,
  type AccountListQuery,
  type AccountView,
  type ResetLocalPasswordInput,
  type UpdateAccountRoleInput,
  type UpdateAccountStatusInput,
} from '@interview-agent/contracts';
import { AuditService } from '../../common/audit/audit.service';
import { hashPassword } from '../../common/authn/password-hash';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import { runSerializable } from '../../common/database/serializable-transaction';
import { randomUUID } from 'node:crypto';
import {
  ACCOUNT_INCLUDE,
  AccountPageSchema,
  accountEmailExists,
  accountNotFound,
  accountWhere,
  assertPlatformAdminRemains,
  localCredentialRequired,
  mapAccount,
  mapAuditLog,
  selfMutationForbidden,
  targetTenantNotFound,
} from './account-governance.helpers';

const EXPORT_LIMIT = 10_000;
const DETAIL_AUDIT_LIMIT = 20;
const ACCOUNT_ORDER = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
const SYSTEM_TENANT_SLUG = 'system';

@Injectable()
export class AccountGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async query(context: ProductRequestContext, query: AccountListQuery) {
    this.assert(context, 'account:read');
    const where = accountWhere(query);
    const [total, records] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: ACCOUNT_INCLUDE,
        orderBy: ACCOUNT_ORDER,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return AccountPageSchema.parse({
      items: records.map(mapAccount),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async export(context: ProductRequestContext, query: AccountListQuery): Promise<AccountView[]> {
    this.assert(context, 'account:read');
    const records = await this.prisma.user.findMany({
      where: accountWhere(query),
      include: ACCOUNT_INCLUDE,
      orderBy: ACCOUNT_ORDER,
      take: EXPORT_LIMIT,
    });
    const accounts = records.map(mapAccount);
    await this.audit.record(context, {
      action: 'account:exported',
      resourceType: 'AccountExport',
      resourceId: context.requestId,
      metadata: { count: accounts.length },
    });
    return accounts;
  }

  async detail(context: ProductRequestContext, accountId: string): Promise<AccountDetail> {
    this.assert(context, 'account:read');
    const [account, auditLogs] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: accountId }, include: ACCOUNT_INCLUDE }),
      this.prisma.auditLog.findMany({
        where: { resourceType: 'User', resourceId: accountId },
        orderBy: { createdAt: 'desc' },
        take: DETAIL_AUDIT_LIMIT,
      }),
    ]);
    if (!account) throw accountNotFound();
    return AccountDetailSchema.parse({
      ...mapAccount(account),
      disabledAt: account.disabledAt?.toISOString() ?? null,
      disabledByUserId: account.disabledByUserId,
      auditLogs: auditLogs.map(mapAuditLog),
    });
  }

  async tenantOptions(context: ProductRequestContext) {
    this.assert(context, 'account:read');
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
    return TenantOptionSchema.array().parse(tenants);
  }

  async createLocalAdmin(context: ProductRequestContext, input: CreateLocalAdminInput) {
    this.assert(context, 'account:write');
    const passwordHash = await hashPassword(input.password);
    try {
      return await runSerializable(this.prisma, async (transaction) => {
        const tenant = await createTargetTenant(transaction, input);
        const account = await transaction.user.create({
          data: {
            tenantId: tenant.id,
            subject: 'local:' + randomUUID(),
            role: input.role,
            name: input.name,
            email: input.email,
          },
          include: ACCOUNT_INCLUDE,
        });
        const credential = await transaction.localCredential.create({
          data: {
            tenantId: tenant.id,
            userId: account.id,
            email: input.email,
            passwordHash,
          },
          select: { id: true },
        });
        await this.audit.record(
          context,
          {
            action: 'account:local_admin_created',
            resourceType: 'User',
            resourceId: account.id,
            metadata: { authSource: 'local', role: input.role, tenantSlug: tenant.slug },
          },
          transaction,
        );
        return mapAccount({ ...account, credential });
      });
    } catch (error) {
      if (isUniqueConstraint(error)) throw accountEmailExists();
      throw error;
    }
  }

  updateRole(context: ProductRequestContext, accountId: string, input: UpdateAccountRoleInput) {
    this.assert(context, 'account:write');
    return runSerializable(this.prisma, async (transaction) => {
      const account = await transaction.user.findUnique({
        where: { id: accountId },
        include: ACCOUNT_INCLUDE,
      });
      if (!account) throw accountNotFound();
      if (account.id === context.actor.id && input.role !== 'platform_admin')
        throw selfMutationForbidden();
      await assertPlatformAdminRemains(transaction, {
        account,
        nextRole: input.role,
        nextStatus: account.status,
      });
      const updated = await transaction.user.update({
        where: { id: accountId },
        data: { role: input.role },
        include: ACCOUNT_INCLUDE,
      });
      await this.audit.record(
        context,
        {
          action: 'account:role_updated',
          resourceType: 'User',
          resourceId: accountId,
          metadata: { fromRole: account.role, toRole: input.role },
        },
        transaction,
      );
      return mapAccount(updated);
    });
  }

  updateStatus(context: ProductRequestContext, accountId: string, input: UpdateAccountStatusInput) {
    this.assert(context, 'account:write');
    return runSerializable(this.prisma, async (transaction) => {
      const account = await transaction.user.findUnique({
        where: { id: accountId },
        include: ACCOUNT_INCLUDE,
      });
      if (!account) throw accountNotFound();
      if (account.id === context.actor.id && input.status === 'disabled')
        throw selfMutationForbidden();
      await assertPlatformAdminRemains(transaction, {
        account,
        nextRole: account.role,
        nextStatus: input.status,
      });
      const disabled = input.status === 'disabled';
      const updated = await transaction.user.update({
        where: { id: accountId },
        data: {
          status: input.status,
          disabledAt: disabled ? new Date() : null,
          disabledByUserId: disabled ? context.actor.id : null,
        },
        include: ACCOUNT_INCLUDE,
      });
      await this.audit.record(
        context,
        {
          action: 'account:status_updated',
          resourceType: 'User',
          resourceId: accountId,
          metadata: { fromStatus: account.status, toStatus: input.status },
        },
        transaction,
      );
      return mapAccount(updated);
    });
  }

  async resetLocalPassword(
    context: ProductRequestContext,
    accountId: string,
    input: ResetLocalPasswordInput,
  ) {
    this.assert(context, 'account:write');
    const passwordHash = await hashPassword(input.password);
    return runSerializable(this.prisma, async (transaction) => {
      const account = await transaction.user.findUnique({
        where: { id: accountId },
        select: { id: true, tenantId: true },
      });
      if (!account) throw accountNotFound();
      const credential = await transaction.localCredential.findUnique({
        where: { tenantId_userId: { tenantId: account.tenantId, userId: account.id } },
        select: { id: true },
      });
      if (!credential) throw localCredentialRequired();
      await transaction.localCredential.update({
        where: { id: credential.id },
        data: { passwordHash },
      });
      await this.audit.record(
        context,
        {
          action: 'account:password_reset',
          resourceType: 'User',
          resourceId: accountId,
          metadata: { authSource: 'local' },
        },
        transaction,
      );
      return { id: accountId };
    });
  }

  private assert(context: ProductRequestContext, action: 'account:read' | 'account:write') {
    this.policy.assert(context.actor, action, { platform: true });
  }
}

async function createTargetTenant(
  transaction: Prisma.TransactionClient,
  input: CreateLocalAdminInput,
) {
  const slug = input.role === 'platform_admin' ? SYSTEM_TENANT_SLUG : input.tenantSlug;
  if (!slug) throw targetTenantNotFound();
  const tenant = await transaction.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!tenant) throw targetTenantNotFound();
  return tenant;
}

function isUniqueConstraint(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
