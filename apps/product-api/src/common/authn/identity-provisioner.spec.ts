import type { PrismaService } from '../database/prisma.service';
import { IdentityProvisioner } from './identity-provisioner';

const identity = {
  subject: 'oidc-user-1',
  tenantSlug: 'tenant-one',
  role: 'user' as const,
  email: 'member@example.com',
  name: 'Member One',
};

describe('IdentityProvisioner', () => {
  it('does not write for an unchanged provisioned identity', async () => {
    const database = identityDatabase();
    database.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
    database.user.findUnique.mockResolvedValue(existingUser());
    const provisioner = new IdentityProvisioner(database as unknown as PrismaService);

    await expect(provisioner.resolve(identity)).resolves.toMatchObject({
      id: 'user-1',
      tenantId: 'tenant-1',
      role: 'user',
    });

    expect(database.$transaction).not.toHaveBeenCalled();
    expect(database.user.update).not.toHaveBeenCalled();
  });

  it('preserves optional profile fields when token claims omit them', async () => {
    const database = identityDatabase();
    database.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
    database.user.findUnique.mockResolvedValue(existingUser());
    const provisioner = new IdentityProvisioner(database as unknown as PrismaService);

    await provisioner.resolve({
      subject: identity.subject,
      tenantSlug: identity.tenantSlug,
      role: identity.role,
    });

    expect(database.user.update).not.toHaveBeenCalled();
  });

  it('updates only changed identity claims', async () => {
    const database = identityDatabase();
    database.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
    database.user.findUnique.mockResolvedValue(existingUser());
    database.user.update.mockResolvedValue({ ...existingUser(), name: 'Renamed Member' });
    const provisioner = new IdentityProvisioner(database as unknown as PrismaService);

    await provisioner.resolve({ ...identity, name: 'Renamed Member' });

    expect(database.user.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: 'tenant-1', id: 'user-1' } },
      data: { name: 'Renamed Member' },
      select: { id: true, subject: true, role: true, tenantId: true },
    });
  });
});

function identityDatabase() {
  return {
    tenant: { findUnique: jest.fn(), upsert: jest.fn() },
    user: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
}

function existingUser() {
  return {
    id: 'user-1',
    subject: identity.subject,
    tenantId: 'tenant-1',
    role: identity.role,
    email: identity.email,
    name: identity.name,
  };
}
