import type { ProductRequestContext } from '../../common/context/request-context';
import type { AuditService } from '../../common/audit/audit.service';
import type { PolicyService } from '../../common/authz/policy.service';
import type { PrismaService } from '../../common/database/prisma.service';
import { AccountGovernanceService } from './account-governance.service';

const context: ProductRequestContext = {
  requestId: 'request-0001',
  traceId: 'trace-0001',
  tenantId: 'system',
  actor: {
    id: 'platform-admin-1',
    subject: 'local:admin',
    tenantId: 'system',
    role: 'platform_admin',
    scopes: ['account:read', 'account:write'],
  },
};

describe('AccountGovernanceService', () => {
  it('lists user accounts first, then backend accounts, with recent logins first in each group', async () => {
    const fixture = dependencies();
    arrangeAccountList(fixture.prisma);

    await expectDefaultAccountOrder(fixture.service);
    expect(fixture.policy.assert).toHaveBeenCalledWith(context.actor, 'account:read', {
      platform: true,
    });
    expectAccountGroupQueries(fixture.prisma);
  });

  it('rejects disabling the current platform administrator before updating the account', async () => {
    const { service, transaction } = dependencies();
    transaction.user.findUnique.mockResolvedValue(
      accountRecord({ id: context.actor.id, role: 'platform_admin' }),
    );

    await expect(
      service.updateStatus(context, context.actor.id, { status: 'disabled' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ACCOUNT_SELF_MUTATION_FORBIDDEN' }),
    });
    expect(transaction.user.update).not.toHaveBeenCalled();
  });
});

describe('AccountGovernanceService protection rules', () => {
  it('creates a local tenant administrator with credential and audit trail', () =>
    expectLocalTenantAdministratorCreation());

  it('keeps at least one active platform administrator during a role downgrade', async () => {
    const { service, transaction } = dependencies();
    transaction.user.findUnique.mockResolvedValue(accountRecord({ role: 'platform_admin' }));
    transaction.user.count.mockResolvedValue(0);

    await expect(service.updateRole(context, 'user-1', { role: 'admin' })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PLATFORM_ADMIN_LAST_MEMBER_PROTECTED' }),
    });
    expect(transaction.user.update).not.toHaveBeenCalled();
  });

  it('rejects password resets for an account without local credentials', async () => {
    const { service, transaction } = dependencies();
    transaction.user.findUnique.mockResolvedValue(accountRecord());
    transaction.localCredential.findUnique.mockResolvedValue(null);

    await expect(
      service.resetLocalPassword(context, 'user-1', { password: 'next-password' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ACCOUNT_LOCAL_CREDENTIAL_REQUIRED' }),
    });
  });
});

function arrangeAccountList(prisma: ReturnType<typeof dependencies>['prisma']) {
  prisma.user.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
  prisma.user.findMany
    .mockResolvedValueOnce([
      accountRecord({ id: 'user-recent', lastSignedInAt: new Date('2026-07-27T14:59:00.000Z') }),
      accountRecord({ id: 'user-older', lastSignedInAt: new Date('2026-07-27T14:20:00.000Z') }),
    ])
    .mockResolvedValueOnce([
      accountRecord({
        id: 'admin-recent',
        role: 'platform_admin',
        lastSignedInAt: new Date('2026-07-27T14:58:00.000Z'),
      }),
    ]);
}

function expectDefaultAccountOrder(service: AccountGovernanceService) {
  return expect(service.query(context, { page: 1, pageSize: 20 })).resolves.toMatchObject({
    total: 3,
    items: [
      { id: 'user-recent', kind: 'user' },
      { id: 'user-older', kind: 'user' },
      { id: 'admin-recent', kind: 'admin' },
    ],
  });
}

function expectAccountGroupQueries(prisma: ReturnType<typeof dependencies>['prisma']) {
  const orderBy = [{ lastSignedInAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }];
  expect(prisma.user.findMany).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      where: { AND: [{ role: { not: 'agent_runtime' } }, { role: 'user' }] },
      orderBy,
      skip: 0,
      take: 2,
    }),
  );
  expect(prisma.user.findMany).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      where: {
        AND: [{ role: { not: 'agent_runtime' } }, { role: { notIn: ['user', 'agent_runtime'] } }],
      },
      orderBy,
      skip: 0,
      take: 18,
    }),
  );
}

async function expectLocalTenantAdministratorCreation() {
  const fixture = dependencies();
  arrangeTenantAdministratorCreation(fixture.transaction);
  await expect(
    fixture.service.createLocalAdmin(context, tenantAdministratorInput()),
  ).resolves.toMatchObject({
    id: 'admin-2',
    authSource: 'local',
    role: 'admin',
    tenant: { slug: 'demo' },
  });
  expect(fixture.policy.assert).toHaveBeenCalledWith(context.actor, 'account:write', {
    platform: true,
  });
  expectTenantAdministratorWrites(fixture);
}

function arrangeTenantAdministratorCreation(
  transaction: ReturnType<typeof dependencies>['transaction'],
) {
  transaction.tenant.findUnique.mockResolvedValue({
    id: 'tenant-2',
    slug: 'demo',
    name: 'Demo Tenant',
  });
  transaction.user.create.mockResolvedValue(
    accountRecord({
      id: 'admin-2',
      tenantId: 'tenant-2',
      subject: 'local:admin-2',
      role: 'admin',
      name: 'Tenant Admin',
      email: 'tenant-admin@example.com',
      tenant: { id: 'tenant-2', slug: 'demo', name: 'Demo Tenant' },
      credential: { id: 'credential-2' },
    }),
  );
  transaction.localCredential.create.mockResolvedValue({ id: 'credential-2' });
}

function tenantAdministratorInput() {
  return {
    name: 'Tenant Admin',
    email: 'tenant-admin@example.com',
    password: 'initial-password',
    role: 'admin' as const,
    tenantSlug: 'demo',
  };
}

function expectTenantAdministratorWrites(fixture: ReturnType<typeof dependencies>) {
  expect(fixture.transaction.user.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-2',
        role: 'admin',
        email: 'tenant-admin@example.com',
      }),
    }),
  );
  expect(fixture.transaction.localCredential.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-2',
        userId: 'admin-2',
        email: 'tenant-admin@example.com',
        passwordHash: expect.any(String),
      }),
    }),
  );
  expect(fixture.audit.record).toHaveBeenCalledWith(
    context,
    expect.objectContaining({
      action: 'account:local_admin_created',
      resourceId: 'admin-2',
      metadata: { authSource: 'local', role: 'admin', tenantSlug: 'demo' },
    }),
    fixture.transaction,
  );
}

function dependencies() {
  const transaction = {
    tenant: { findUnique: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
    localCredential: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    user: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    auditLog: { findMany: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };
  const policy = { assert: jest.fn() };
  const audit = { record: jest.fn().mockResolvedValue({}) };
  return {
    service: new AccountGovernanceService(
      prisma as unknown as PrismaService,
      policy as unknown as PolicyService,
      audit as unknown as AuditService,
    ),
    audit,
    prisma,
    transaction,
    policy,
  };
}

function accountRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    subject: 'local:user-1',
    role: 'user',
    status: 'active',
    name: 'Avery Lin',
    email: 'avery@example.com',
    disabledAt: null,
    disabledByUserId: null,
    lastSignedInAt: new Date('2026-07-15T00:00:00.000Z'),
    createdAt: new Date('2026-07-14T00:00:00.000Z'),
    tenant: { id: 'tenant-1', name: 'Avery 的个人空间', slug: 'member-avery' },
    credential: { id: 'credential-1' },
    ...overrides,
  };
}
