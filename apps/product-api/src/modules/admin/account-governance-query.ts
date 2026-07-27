import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../common/database/prisma.service';
import { ACCOUNT_INCLUDE } from './account-governance.helpers';

type AccountReadClient = Pick<PrismaService, 'user'>;
type AccountPageInput = {
  where: Prisma.UserWhereInput;
  page: number;
  pageSize: number;
};
type AccountGroupInput = {
  where: Prisma.UserWhereInput;
  skip: number;
  take: number;
};

const ACCOUNT_LOGIN_ORDER = [
  { lastSignedInAt: { sort: 'desc', nulls: 'last' } },
  { id: 'desc' },
] satisfies Prisma.UserOrderByWithRelationInput[];

export async function loadAccountPage(prisma: AccountReadClient, input: AccountPageInput) {
  const groups = accountGroups(input.where);
  const [total, userTotal] = await Promise.all([
    prisma.user.count({ where: input.where }),
    prisma.user.count({ where: groups.user }),
  ]);
  const bounds = pageBounds(input, userTotal);
  const [users, administrators] = await Promise.all([
    loadAccountGroup(prisma, { where: groups.user, skip: bounds.userSkip, take: bounds.userTake }),
    loadAccountGroup(prisma, {
      where: groups.admin,
      skip: bounds.adminSkip,
      take: bounds.adminTake,
    }),
  ]);
  return { total, records: [...users, ...administrators] };
}

function accountGroups(where: Prisma.UserWhereInput) {
  return {
    user: { AND: [where, { role: 'user' }] } satisfies Prisma.UserWhereInput,
    admin: {
      AND: [where, { role: { notIn: ['user', 'agent_runtime'] } }],
    } satisfies Prisma.UserWhereInput,
  };
}

function pageBounds(input: AccountPageInput, userTotal: number) {
  const offset = (input.page - 1) * input.pageSize;
  const userSkip = Math.min(offset, userTotal);
  const userTake = Math.max(0, Math.min(input.pageSize, userTotal - userSkip));
  return {
    userSkip,
    userTake,
    adminSkip: Math.max(0, offset - userTotal),
    adminTake: input.pageSize - userTake,
  };
}

function loadAccountGroup(prisma: AccountReadClient, input: AccountGroupInput) {
  if (input.take === 0) return Promise.resolve([]);
  return prisma.user.findMany({
    where: input.where,
    include: ACCOUNT_INCLUDE,
    orderBy: ACCOUNT_LOGIN_ORDER,
    skip: input.skip,
    take: input.take,
  });
}
