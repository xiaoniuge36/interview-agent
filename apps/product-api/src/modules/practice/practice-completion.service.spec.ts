import type { ProductRequestContext } from '../../common/context/request-context';
import type { PrismaService } from '../../common/database/prisma.service';
import { PracticeCompletionService } from './practice-completion.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'user-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['practice:submit'],
  },
};

test('无模型自学完成要求全部题目已保存并且不创建报告', async () => {
  const session = {
    id: 'session-1',
    tenantId: context.tenantId,
    userId: context.actor.id,
    status: 'in_progress',
    items: [{ answer: 'answer' }, { answer: 'answer-2' }],
    report: null,
  };
  const transaction = {
    practiceSession: {
      findFirst: jest.fn().mockResolvedValue(session),
      update: jest.fn().mockResolvedValue({}),
    },
    practiceReport: { create: jest.fn() },
  };
  const prisma = {
    ...transaction,
    $transaction: jest.fn(async (operation: (client: unknown) => unknown) =>
      operation(transaction),
    ),
  };
  const service = new PracticeCompletionService(
    prisma as unknown as PrismaService,
    { assert: jest.fn() } as never,
    { record: jest.fn() } as never,
  );

  await service.completeSelfStudy(context, session.id);

  expect(prisma.practiceSession.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ status: 'submitted' }) }),
  );
  expect(prisma.practiceReport.create).not.toHaveBeenCalled();
});
