import { AiInvocationOperation } from '@prisma/client';

it('keeps the Prisma AI invocation enum aligned with the practice report contract', () => {
  expect(Object.values(AiInvocationOperation)).toContain('practice_report');
});
