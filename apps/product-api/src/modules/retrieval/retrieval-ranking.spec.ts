import { mergeRankedHits } from './retrieval-ranking';

const keywordHit = {
  id: 'chunk-a',
  tenantId: 'tenant-1',
  entityType: 'knowledge',
  entityId: 'a',
  content: 'keyword evidence',
  metadata: {},
};
const vectorHit = {
  id: 'chunk-b',
  tenantId: 'tenant-1',
  entityType: 'knowledge',
  entityId: 'b',
  content: 'vector evidence',
  metadata: {},
};

test('merges keyword and vector ranks without duplicating a shared hit', () => {
  const hits = mergeRankedHits(
    [
      { ...keywordHit, score: 0.8 },
      { ...vectorHit, score: 0.3 },
    ],
    [
      { ...vectorHit, score: 0.9 },
      { ...keywordHit, score: 0.4 },
    ],
    2,
  );

  expect(hits).toHaveLength(2);
  expect(hits[0]).toMatchObject({ id: 'chunk-a', source: 'hybrid' });
  expect(hits[1]).toMatchObject({ id: 'chunk-b', source: 'hybrid' });
  expect(hits[0]!.score).toBeGreaterThanOrEqual(hits[1]!.score);
});

test('keeps a keyword-only fallback when vector retrieval returns no hits', () => {
  const hits = mergeRankedHits([{ ...keywordHit, score: 0.8 }], [], 8);

  expect(hits).toEqual([expect.objectContaining({ id: 'chunk-a', source: 'keyword' })]);
});
