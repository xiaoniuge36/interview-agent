import type { ProductRequestContext } from '../../common/context/request-context';
import type { PrismaService } from '../../common/database/prisma.service';
import { PracticeCommandService } from './practice-command.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'user-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['practice:answer'],
  },
};

test('修改已评价答案时删除旧评价并恢复 answered 状态', async () => {
  const session = sessionRecord();
  const transaction = {
    practiceSession: { findFirst: jest.fn().mockResolvedValue(session) },
    practiceSessionItem: { update: jest.fn().mockResolvedValue({}) },
    evaluationResult: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    ...transaction,
    $transaction: jest.fn(async (operation: (client: unknown) => unknown) =>
      operation(transaction),
    ),
  };
  const service = new PracticeCommandService(
    prisma as unknown as PrismaService,
    { assert: jest.fn() } as never,
    { record: jest.fn() } as never,
  );

  await service.submitAnswer({
    context,
    sessionId: session.id,
    itemId: session.items[0]!.id,
    input: { answer: '新的完整回答' },
  });

  expect(prisma.evaluationResult.deleteMany).toHaveBeenCalledWith({
    where: { tenantId: context.tenantId, sessionItemId: session.items[0]!.id },
  });
  expect(prisma.practiceSessionItem.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ status: 'answered' }) }),
  );
});

function sessionRecord() {
  return {
    id: 'session-1',
    tenantId: context.tenantId,
    userId: context.actor.id,
    status: 'in_progress',
    items: [
      {
        id: 'item-1',
        tenantId: context.tenantId,
        answer: '旧回答',
        evaluation: { id: 'evaluation-1' },
      },
    ],
  };
}
