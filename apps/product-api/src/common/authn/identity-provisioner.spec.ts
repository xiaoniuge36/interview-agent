import type { PrismaService } from '../database/prisma.service';
import { IdentityProvisioner } from './identity-provisioner';

const NOW = new Date('2026-07-16T10:00:00.000Z');
const FRESH_SIGN_IN = new Date('2026-07-16T09:58:00.000Z');
const STALE_SIGN_IN = new Date('2026-07-16T09:00:00.000Z');
const CACHE_TTL_MS = 30_000;

const identity = {
  subject: 'oidc-user-1',
  tenantSlug: 'tenant-one',
  role: 'user' as const,
  email: 'member@example.com',
  name: 'Member One',
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('IdentityProvisioner sign-in write throttling', () => {
  it('skips the update entirely for an unchanged identity that signed in recently', async () => {
    const { database, provisioner } = setup();

    await expect(provisioner.resolve(identity)).resolves.toMatchObject({
      id: 'user-1',
      tenantId: 'tenant-1',
      role: 'user',
    });

    expect(database.$transaction).not.toHaveBeenCalled();
    expect(database.user.update).not.toHaveBeenCalled();
  });

  it('refreshes lastSignedInAt when the previous sign-in is older than the interval', async () => {
    const { database, provisioner } = setup(existingUser({ lastSignedInAt: STALE_SIGN_IN }));

    await provisioner.resolve(identity);

    expect(database.user.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: 'tenant-1', id: 'user-1' } },
      data: { lastSignedInAt: expect.any(Date) },
      select: { id: true, subject: true, role: true, tenantId: true },
    });
  });

  it('records the first sign-in when lastSignedInAt was never set', async () => {
    const { database, provisioner } = setup(existingUser({ lastSignedInAt: null }));

    await provisioner.resolve(identity);

    expect(database.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { lastSignedInAt: expect.any(Date) } }),
    );
  });

  it('preserves optional profile fields when token claims omit them', async () => {
    const { database, provisioner } = setup(existingUser({ lastSignedInAt: STALE_SIGN_IN }));

    await provisioner.resolve({
      subject: identity.subject,
      tenantSlug: identity.tenantSlug,
      role: identity.role,
    });

    expect(database.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { lastSignedInAt: expect.any(Date) } }),
    );
  });

  it('writes changed identity claims even inside the sign-in throttle window', async () => {
    const { database, provisioner } = setup();

    await provisioner.resolve({ ...identity, name: 'Renamed Member' });

    expect(database.user.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: 'tenant-1', id: 'user-1' } },
      data: { name: 'Renamed Member', lastSignedInAt: expect.any(Date) },
      select: { id: true, subject: true, role: true, tenantId: true },
    });
  });
});

describe('IdentityProvisioner actor cache', () => {
  it('serves repeated resolutions from the cache without extra queries', async () => {
    const { database, provisioner } = setup();

    const first = await provisioner.resolve(identity);
    const second = await provisioner.resolve(identity);

    expect(second).toEqual(first);
    expect(database.tenant.findUnique).toHaveBeenCalledTimes(1);
    expect(database.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it('expires cache entries after the TTL and queries the database again', async () => {
    const { database, provisioner } = setup();

    await provisioner.resolve(identity);
    jest.setSystemTime(new Date(NOW.getTime() + CACHE_TTL_MS + 1));
    await provisioner.resolve(identity);

    expect(database.user.findUnique).toHaveBeenCalledTimes(2);
  });

  it('bypasses the cache when token claims change', async () => {
    const { database, provisioner } = setup();

    await provisioner.resolve(identity);
    await provisioner.resolve({ ...identity, name: 'Renamed Member' });

    expect(database.user.findUnique).toHaveBeenCalledTimes(2);
    expect(database.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Renamed Member', lastSignedInAt: expect.any(Date) },
      }),
    );
  });

  it('isolates cache entries per tenant for the same subject', async () => {
    const { database, provisioner } = setup();

    await provisioner.resolve(identity);
    await provisioner.resolve({ ...identity, tenantSlug: 'tenant-two' });

    expect(database.tenant.findUnique).toHaveBeenCalledTimes(2);
    expect(database.tenant.findUnique).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { slug: 'tenant-two' } }),
    );
  });
});

describe('IdentityProvisioner governed accounts', () => {
  it('does not let a token role overwrite a governed account role', async () => {
    const { database, provisioner } = setup(existingUser({ lastSignedInAt: STALE_SIGN_IN }));

    await provisioner.resolve({ ...identity, role: 'admin' });

    expect(database.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.not.objectContaining({ role: 'admin' }) }),
    );
  });

  it('rejects a disabled account before provisioning updates', async () => {
    const { database, provisioner } = setup(existingUser({ status: 'disabled' }));

    await expect(provisioner.resolve(identity)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ACCOUNT_DISABLED' }),
    });
    expect(database.user.update).not.toHaveBeenCalled();
  });
});

function setup(user: Record<string, unknown> = existingUser()) {
  const database = identityDatabase();
  database.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
  database.user.findUnique.mockResolvedValue(user);
  database.user.update.mockResolvedValue(existingUser());
  const provisioner = new IdentityProvisioner(database as unknown as PrismaService);
  return { database, provisioner };
}

function identityDatabase() {
  return {
    tenant: { findUnique: jest.fn(), upsert: jest.fn() },
    user: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
}

function existingUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    subject: identity.subject,
    tenantId: 'tenant-1',
    role: identity.role,
    email: identity.email,
    name: identity.name,
    status: 'active',
    lastSignedInAt: FRESH_SIGN_IN,
    ...overrides,
  };
}
