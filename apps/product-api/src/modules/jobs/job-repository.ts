import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

type EnqueueInput = {
  tenantId: string;
  type: 'embedding';
  dedupeKey: string;
  payload: Prisma.InputJsonValue;
};

const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_DELAY_MAX_MS = 60_000;
const JOB_LEASE_SECONDS = 60;

type ClaimedJob = {
  id: string;
  tenantId: string;
  type: 'embedding';
  payload: Prisma.JsonValue;
  attempts: number;
  maxAttempts: number;
};

type JobClient = Pick<PrismaService, 'backgroundJob'> | Prisma.TransactionClient;

@Injectable()
export class BackgroundJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  enqueue(input: EnqueueInput, client: JobClient = this.prisma) {
    const identity = { tenantId: input.tenantId, type: input.type, dedupeKey: input.dedupeKey };
    return client.backgroundJob.upsert({
      where: { tenantId_type_dedupeKey: identity },
      create: { ...identity, payload: input.payload },
      update: {},
    });
  }

  removeKnowledgeEmbeddings(tenantId: string, assetId: string, client: JobClient = this.prisma) {
    return client.backgroundJob.deleteMany({
      where: {
        tenantId,
        type: 'embedding',
        status: { in: ['pending', 'retry_wait'] },
        AND: [
          { payload: { path: ['entityType'], equals: 'knowledge' } },
          { payload: { path: ['metadata', 'assetId'], equals: assetId } },
        ],
      },
    });
  }

  async claim(owner: string) {
    return this.claimMatching(
      owner,
      Prisma.sql`"status" IN ('pending', 'retry_wait') AND "availableAt" <= NOW()`,
    );
  }

  async claimExpired(owner: string) {
    return this.claimMatching(owner, Prisma.sql`"status" = 'running' AND "leaseExpiresAt" < NOW()`);
  }

  async complete(job: { id: string }) {
    await this.prisma.backgroundJob.update({
      where: { id: job.id },
      data: { status: 'succeeded', leaseOwner: null, leaseExpiresAt: null, errorCode: null },
    });
  }

  async retry(job: { id: string; attempts: number }, code: string) {
    await this.prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: 'retry_wait',
        availableAt: new Date(Date.now() + retryDelay(job.attempts)),
        errorCode: code,
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
  }

  async deadLetter(job: { id: string }, code: string) {
    await this.prisma.backgroundJob.update({
      where: { id: job.id },
      data: { status: 'dead_letter', errorCode: code, leaseOwner: null, leaseExpiresAt: null },
    });
  }

  private async claimMatching(owner: string, condition: Prisma.Sql): Promise<ClaimedJob | null> {
    const rows = await this.prisma.$queryRaw<ClaimedJob[]>(Prisma.sql`
      WITH next AS (
        SELECT "id" FROM "BackgroundJob" WHERE ${condition}
        FOR UPDATE SKIP LOCKED LIMIT 1
      )
      UPDATE "BackgroundJob"
      SET "status" = 'running', "leaseOwner" = ${owner},
          "leaseExpiresAt" = NOW() + make_interval(secs => ${JOB_LEASE_SECONDS}),
          "attempts" = "attempts" + 1
      WHERE "id" IN (SELECT "id" FROM next)
        RETURNING "id", "tenantId", "type", "payload", "attempts", "maxAttempts"
    `);
    return rows[0] ?? null;
  }
}

function retryDelay(attempts: number) {
  return Math.min(RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1), RETRY_DELAY_MAX_MS);
}
