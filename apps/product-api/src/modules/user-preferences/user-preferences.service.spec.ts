import type { ProductRequestContext } from '../../common/context/request-context';
import { UserPreferencesService } from './user-preferences.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-0001',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'subject-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['preferences:read', 'preferences:write'],
  },
};

const preferenceRecord = {
  id: 'preference-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  theme: 'terminal',
  motion: false,
  createdAt: new Date('2026-08-17T00:00:00.000Z'),
  updatedAt: new Date('2026-08-17T00:00:00.000Z'),
};

function createService(stored: typeof preferenceRecord | null = preferenceRecord) {
  const transaction = {
    userPreference: {
      upsert: jest.fn().mockResolvedValue(preferenceRecord),
    },
  };
  const prisma = {
    userPreference: {
      findUnique: jest.fn().mockResolvedValue(stored),
    },
    $transaction: jest.fn((callback) => callback(transaction)),
  };
  const policy = { assert: jest.fn() };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new UserPreferencesService(prisma as never, policy as never, audit as never);
  return { service, prisma, transaction, policy, audit };
}

describe('UserPreferencesService reads', () => {
  it('没有服务端记录时返回 null，并只查询当前租户用户', async () => {
    const { service, prisma, policy } = createService(null);

    await expect(service.get(context)).resolves.toEqual({ preferences: null });
    expect(prisma.userPreference.findUnique).toHaveBeenCalledWith({
      where: { tenantId_userId: { tenantId: 'tenant-1', userId: 'user-1' } },
    });
    expect(policy.assert).toHaveBeenCalledWith(context.actor, 'preferences:read', {
      tenantId: 'tenant-1',
      ownerId: 'user-1',
    });
  });
});

describe('UserPreferencesService writes', () => {
  it('按当前用户 upsert 偏好并记录审计事件', async () => {
    const { service, transaction, policy, audit } = createService();

    await expect(service.upsert(context, { theme: 'terminal', motion: false })).resolves.toEqual({
      preferences: {
        id: 'preference-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        theme: 'terminal',
        motion: false,
        updatedAt: '2026-08-17T00:00:00.000Z',
      },
    });
    expect(transaction.userPreference.upsert).toHaveBeenCalledWith({
      where: { tenantId_userId: { tenantId: 'tenant-1', userId: 'user-1' } },
      create: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        theme: 'terminal',
        motion: false,
      },
      update: { theme: 'terminal', motion: false },
    });
    expect(policy.assert).toHaveBeenCalledWith(context.actor, 'preferences:write', {
      tenantId: 'tenant-1',
      ownerId: 'user-1',
    });
    expect(audit.record).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        action: 'preferences.upsert',
        resourceType: 'UserPreference',
        resourceId: 'preference-1',
      }),
      transaction,
    );
  });
});
