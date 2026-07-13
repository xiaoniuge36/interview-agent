import { Prisma } from '@prisma/client';
import type { PrismaService } from './prisma.service';

const MAX_SERIALIZABLE_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 25;

export async function runSerializable<T>(
  prisma: PrismaService,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      lastError = error;
      if (!isSerializationConflict(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS) throw error;
      await delay(RETRY_BASE_DELAY_MS * attempt);
    }
  }
  throw lastError;
}

export function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function isSerializationConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
