import { PrismaClient } from '@prisma/client';
import { LocalSignInInputSchema } from '../src/common/authn/local-auth.input';
import { hashPassword } from '../src/common/authn/password-hash';

const SYSTEM_TENANT_SLUG = 'system';
const SYSTEM_TENANT_NAME = 'Interview Agent System';
const LOCAL_ADMIN_SUBJECT = 'local:admin';
const DEFAULT_ADMIN_NAME = 'System Administrator';
const MIN_ADMIN_NAME_LENGTH = 2;
const MAX_ADMIN_NAME_LENGTH = 80;
const prisma = new PrismaClient();

type LocalAdminConfiguration = {
  email: string;
  name: string;
  password: string;
};

async function bootstrapLocalAdmin() {
  if (process.env.AUTH_MODE !== 'jwt_hs256') {
    console.info('Skipped local administrator bootstrap because AUTH_MODE is not jwt_hs256.');
    return;
  }

  const configuration = readLocalAdminConfiguration();
  if (!configuration) {
    console.info('Skipped local administrator bootstrap because LOCAL_ADMIN_EMAIL is not configured.');
    return;
  }

  await upsertLocalAdmin(configuration);
  console.info(`Bootstrapped local administrator ${configuration.email}.`);
}

async function upsertLocalAdmin(configuration: LocalAdminConfiguration) {
  const passwordHash = await hashPassword(configuration.password);
  await prisma.$transaction(async (transaction) => {
    const tenant = await transaction.tenant.upsert({
      where: { slug: SYSTEM_TENANT_SLUG },
      create: { slug: SYSTEM_TENANT_SLUG, name: SYSTEM_TENANT_NAME },
      update: { name: SYSTEM_TENANT_NAME },
      select: { id: true },
    });
    const user = await transaction.user.upsert({
      where: { tenantId_subject: { tenantId: tenant.id, subject: LOCAL_ADMIN_SUBJECT } },
      create: {
        tenantId: tenant.id,
        subject: LOCAL_ADMIN_SUBJECT,
        role: 'admin',
        email: configuration.email,
        name: configuration.name,
      },
      update: {
        role: 'admin',
        email: configuration.email,
        name: configuration.name,
      },
      select: { id: true },
    });
    await transaction.localCredential.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        email: configuration.email,
        passwordHash,
      },
      update: { email: configuration.email, passwordHash },
    });
  });
}

function readLocalAdminConfiguration(): LocalAdminConfiguration | null {
  const email = process.env.LOCAL_ADMIN_EMAIL?.trim();
  const password = process.env.LOCAL_ADMIN_PASSWORD;
  if (!email && !password) return null;
  if (!email || !password) {
    throw new Error('LOCAL_ADMIN_EMAIL 和 LOCAL_ADMIN_PASSWORD 必须同时配置。');
  }
  const credentials = LocalSignInInputSchema.parse({ email, password });
  const name = process.env.LOCAL_ADMIN_NAME?.trim() || DEFAULT_ADMIN_NAME;
  if (name.length < MIN_ADMIN_NAME_LENGTH || name.length > MAX_ADMIN_NAME_LENGTH) {
    throw new Error(
      `LOCAL_ADMIN_NAME 必须为 ${MIN_ADMIN_NAME_LENGTH} 到 ${MAX_ADMIN_NAME_LENGTH} 个字符。`,
    );
  }
  return { ...credentials, name };
}

bootstrapLocalAdmin()
  .catch((error: unknown) => {
    console.error('Local administrator bootstrap failed.', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
