import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryEventSchema } from './report';

const event = {
  id: 'memory-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  schemaVersion: 1,
  dedupeKey: 'practice:session-1:system-design',
  sourceType: 'practice',
  eventType: 'skill_observation',
  sourceId: 'session-1',
  tag: 'system-design',
  observedScore: 72,
  evidence: '回答覆盖了状态机和幂等边界。',
  delta: { traceId: 'trace-0001' },
  confidence: 0.8,
  traceId: 'trace-0001',
  createdAt: '2026-07-28T00:00:00.000Z',
};

test('MemoryEventSchema accepts versioned skill observations', () => {
  assert.equal(MemoryEventSchema.parse(event).dedupeKey, event.dedupeKey);
});

test('MemoryEventSchema rejects an out-of-range observation', () => {
  assert.throws(() => MemoryEventSchema.parse({ ...event, observedScore: 101 }));
});
