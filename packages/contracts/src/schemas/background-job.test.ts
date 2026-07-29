import assert from 'node:assert/strict';
import test from 'node:test';
import { BackgroundJobSchema } from './background-job';

test('background jobs accept retry wait state with attempts', () => {
  const job = BackgroundJobSchema.parse({
    id: 'job-1',
    tenantId: 'tenant-1',
    type: 'embedding',
    status: 'retry_wait',
    attempts: 2,
    maxAttempts: 5,
    payload: { chunkId: 'chunk-1' },
    availableAt: '2026-07-28T00:00:00.000Z',
    createdAt: '2026-07-28T00:00:00.000Z',
    updatedAt: '2026-07-28T00:00:00.000Z',
  });

  assert.equal(job.status, 'retry_wait');
});
