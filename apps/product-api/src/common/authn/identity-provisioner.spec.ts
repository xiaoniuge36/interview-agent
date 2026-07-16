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
  it('keeps an unchanged provisioned identity while recording a successful authentication', async () => {
    const database = identityDatabase();
    database.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
    database.user.findUnique.mockResolvedValue(existingUser());
    database.user.update.mockResolvedValue(existingUser());
    const provisioner = new IdentityProvisioner(database as unknown as PrismaService);

    await expect(provisioner.resolve(identity)).resolves.toMatchObject({
      id: 'user-1',
      tenantId: 'tenant-1',
      role: 'user',
    });

    expect(database.$transaction).not.toHaveBeenCalled();
    expect(database.user.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: 'tenant-1', id: 'user-1' } },
      data: { lastSignedInAt: expect.any(Date) },
      select: { id: true, subject: true, role: true, tenantId: true },
    });
  });

  it('preserves optional profile fields when token claims omit them', async () => {
    const database = identityDatabase();
    database.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
    database.user.findUnique.mockResolvedValue(existingUser());
    database.user.update.mockResolvedValue(existingUser());
    const provisioner = new IdentityProvisioner(database as unknown as PrismaService);

    await provisioner.resolve({
      subject: identity.subject,
      tenantSlug: identity.tenantSlug,
      role: identity.role,
    });

    expect(database.user.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: 'tenant-1', id: 'user-1' } },
      data: { lastSignedInAt: expect.any(Date) },
      select: { id: true, subject: true, role: true, tenantId: true },
    });
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
      data: { name: 'Renamed Member', lastSignedInAt: expect.any(Date) },
      select: { id: true, subject: true, role: true, tenantId: true },
    });
  });
});

describe('IdentityProvisioner governed accounts', () => {
  it('does not let a token role overwrite a governed account role', async () => {
    const database = identityDatabase();
    database.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
    database.user.findUnique.mockResolvedValue(existingUser());
    database.user.update.mockResolvedValue(existingUser());
    const provisioner = new IdentityProvisioner(database as unknown as PrismaService);

    await provisioner.resolve({ ...identity, role: 'admin' });

    expect(database.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.not.objectContaining({ role: 'admin' }) }),
    );
  });

  it('rejects a disabled account before provisioning updates', async () => {
    const database = identityDatabase();
    database.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
    database.user.findUnique.mockResolvedValue({ ...existingUser(), status: 'disabled' });
    const provisioner = new IdentityProvisioner(database as unknown as PrismaService);

    await expect(provisioner.resolve(identity)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ACCOUNT_DISABLED' }),
    });
    expect(database.user.update).not.toHaveBeenCalled();
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
    status: 'active',
  };
}
