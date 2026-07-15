import { Prisma } from '@prisma/client';
import type { PrismaService } from './prisma.service';
import { runSerializable } from './serializable-transaction';

describe('runSerializable', () => {
  it('retries a transaction that could not start before the pool wait limit', async () => {
    const operation = jest.fn().mockResolvedValue('complete');
    const prisma = {
      $transaction: jest
        .fn()
        .mockRejectedValueOnce(transactionStartTimeout())
        .mockImplementationOnce((callback: (client: Prisma.TransactionClient) => Promise<string>) =>
          callback({} as Prisma.TransactionClient),
        ),
    } as unknown as PrismaService;

    await expect(runSerializable(prisma, operation)).resolves.toBe('complete');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

function transactionStartTimeout() {
  return new Prisma.PrismaClientKnownRequestError(
    'Transaction API error: Unable to start a transaction in the given time.',
    { code: 'P2028', clientVersion: 'test' },
  );
}
