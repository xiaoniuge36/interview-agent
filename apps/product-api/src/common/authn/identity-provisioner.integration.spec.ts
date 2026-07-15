import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { IdentityProvisioner } from './identity-provisioner';

const describeDatabase = process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;
const suffix = randomUUID();
const tenantSlug = `identity-tenant-${suffix}`;
const subject = `identity-subject-${suffix}`;
const prisma = new PrismaService();
const provisioner = new IdentityProvisioner(prisma);

describeDatabase('IdentityProvisioner database integration', () => {
  beforeAll(() => prisma.$connect());

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { tenant: { slug: tenantSlug } } });
    await prisma.tenant.deleteMany({ where: { slug: tenantSlug } });
    await prisma.$disconnect();
  });

  it('creates one tenant and user for concurrent first-time identity resolution', async () => {
    const input = {
      subject,
      tenantSlug,
      role: 'user' as const,
      email: `identity-${suffix}@example.com`,
      name: 'Concurrent Identity',
    };

    const [first, second] = await Promise.all([
      provisioner.resolve(input),
      provisioner.resolve(input),
    ]);

    expect(first).toMatchObject({ tenantId: second.tenantId, id: second.id, role: 'user' });
    expect(await prisma.tenant.count({ where: { slug: tenantSlug } })).toBe(1);
    expect(
      await prisma.user.count({
        where: { tenantId: first.tenantId, subject },
      }),
    ).toBe(1);
  });
});
