import { MemoryProjectionService } from './memory-projection.service';

const event = {
  id: 'memory-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  schemaVersion: 1 as const,
  dedupeKey: 'practice:session-1:system-design',
  sourceType: 'practice' as const,
  eventType: 'skill_observation' as const,
  sourceId: 'session-1',
  tag: 'system-design',
  observedScore: 40,
  evidence: '缺少容量规划。',
  delta: {},
  confidence: 1,
  traceId: 'trace-0001',
  createdAt: '2026-07-28T00:00:00.000Z',
};

test('persists an observation before projecting mastery', async () => {
  const tx = {
    memoryEvent: { create: jest.fn().mockResolvedValue({ id: event.id }) },
    masteryProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };

  await new MemoryProjectionService().apply(tx as never, [event]);

  expect(tx.memoryEvent.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      dedupeKey: event.dedupeKey,
      observedScore: event.observedScore,
    }),
  });
  expect(tx.masteryProfile.upsert).toHaveBeenCalledWith(
    expect.objectContaining({ create: expect.objectContaining({ score: 40, trend: 'falling' }) }),
  );
});

test('does not project an observation whose dedupe key already exists', async () => {
  const duplicate = Object.assign(new Error('duplicate'), { code: 'P2002' });
  const tx = {
    memoryEvent: { create: jest.fn().mockRejectedValue(duplicate) },
    masteryProfile: { findUnique: jest.fn(), upsert: jest.fn() },
  };

  await expect(new MemoryProjectionService().apply(tx as never, [event])).resolves.toBeUndefined();

  expect(tx.masteryProfile.findUnique).not.toHaveBeenCalled();
  expect(tx.masteryProfile.upsert).not.toHaveBeenCalled();
});
