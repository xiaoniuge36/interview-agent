import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { MemoryEvent } from '@interview-agent/contracts';
import { projectMastery } from './memory-projection';

@Injectable()
export class MemoryProjectionService {
  async apply(transaction: Prisma.TransactionClient, events: MemoryEvent[]): Promise<void> {
    for (const event of events) {
      const created = await createMemoryEvent(transaction, event);
      if (!created) continue;
      const identity = { tenantId: event.tenantId, userId: event.userId, tag: event.tag };
      const current = await transaction.masteryProfile.findUnique({
        where: { tenantId_userId_tag: identity },
      });
      const projection = projectMastery(current, event);
      await transaction.masteryProfile.upsert({
        where: { tenantId_userId_tag: identity },
        create: { ...identity, ...projection, lastEvidenceEventId: created.id },
        update: { ...projection, lastEvidenceEventId: created.id },
      });
    }
  }
}

async function createMemoryEvent(transaction: Prisma.TransactionClient, event: MemoryEvent) {
  try {
    return await transaction.memoryEvent.create({ data: memoryRecord(event) });
  } catch (error) {
    if (isDuplicateKey(error)) return null;
    throw error;
  }
}

function isDuplicateKey(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002'
  );
}

function memoryRecord(event: MemoryEvent): Prisma.MemoryEventCreateInput {
  return {
    id: event.id,
    tenant: { connect: { id: event.tenantId } },
    user: { connect: { tenantId_id: { tenantId: event.tenantId, id: event.userId } } },
    schemaVersion: event.schemaVersion,
    dedupeKey: event.dedupeKey,
    sourceType: event.sourceType,
    eventType: event.eventType,
    sourceId: event.sourceId,
    tag: event.tag,
    observedScore: event.observedScore,
    evidence: event.evidence,
    delta: event.delta as Prisma.InputJsonValue,
    confidence: event.confidence,
    traceId: event.traceId,
    createdAt: new Date(event.createdAt),
  };
}
