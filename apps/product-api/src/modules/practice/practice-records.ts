import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../common/database/prisma.service';
import { SESSION_INCLUDE, type SessionRecord } from './practice-mappers';

type PracticeSessionReader = Pick<PrismaService, 'practiceSession'> | Prisma.TransactionClient;

export async function loadPracticeSession(
  client: PracticeSessionReader,
  sessionId: string,
  tenantId: string,
): Promise<SessionRecord> {
  const session = await client.practiceSession.findFirst({
    where: { id: sessionId, tenantId },
    include: SESSION_INCLUDE,
  });
  if (session) return session;
  throw new NotFoundException({ code: 'PRACTICE_SESSION_NOT_FOUND' });
}
