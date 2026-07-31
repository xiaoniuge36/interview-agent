import assert from 'node:assert/strict';
import test from 'node:test';
import { RetrievalHitSchema, RetrievalQuerySchema } from './retrieval';

test('retrieval queries coerce HTTP limits and default to a bounded count', () => {
  assert.equal(
    RetrievalQuerySchema.parse({ query: 'transaction boundary', purpose: 'training' }).limit,
    8,
  );
  assert.equal(
    RetrievalQuerySchema.parse({ query: 'http query', purpose: 'training', limit: '5' }).limit,
    5,
  );
});

test('retrieval hits reject empty identifiers and out-of-range scores', () => {
  assert.throws(() => RetrievalHitSchema.parse({ id: '', score: 2 }));
});
