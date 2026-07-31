import { RetrievalRepository } from './retrieval-repository';

const scope = {
  tenantId: 'tenant-1',
  entityTypes: ['knowledge'],
  query: 'event sourcing',
  limit: 8,
};

test('maps keyword rows to retrieval hits without relaxing tenant scope', async () => {
  const $queryRaw = jest.fn().mockResolvedValue([row({ score: 0.7 })]);
  const repository = new RetrievalRepository({ $queryRaw } as never);

  await expect(repository.searchKeyword(scope)).resolves.toEqual([
    expect.objectContaining({ id: 'chunk-1', tenantId: 'tenant-1', score: 0.7 }),
  ]);
  expect($queryRaw).toHaveBeenCalledTimes(1);
  expect(sqlText($queryRaw)).toContain('"KnowledgeAsset"');
  expect(sqlText($queryRaw)).toContain("'published'");
  expect(sqlText($queryRaw)).toContain('"metadata"->>\'assetId\'');
});

test('applies the published-asset fence to vector recall too', async () => {
  const $executeRaw = jest.fn();
  const $queryRaw = jest.fn().mockResolvedValue([row({ score: 0.7 })]);
  const repository = new RetrievalRepository({
    $transaction: jest.fn(
      (callback: (client: { $executeRaw: jest.Mock; $queryRaw: jest.Mock }) => unknown) =>
        callback({ $executeRaw, $queryRaw }),
    ),
  } as never);

  await repository.searchVector(
    scope,
    Array.from({ length: 1536 }, () => 0.1),
  );

  expect(sqlText($queryRaw)).toContain('"KnowledgeAsset"');
  expect(sqlText($queryRaw)).toContain("'published'");
});

test('does not project a knowledge embedding after its asset was withdrawn', async () => {
  const retrievalChunk = {
    upsert: jest.fn().mockResolvedValue({ id: 'chunk-1' }),
    deleteMany: jest.fn(),
  };
  const $executeRaw = jest.fn();
  const $queryRaw = jest.fn().mockResolvedValue([]);
  const repository = new RetrievalRepository({
    retrievalChunk,
    $executeRaw,
    $transaction: jest.fn(
      (
        callback: (client: {
          retrievalChunk: typeof retrievalChunk;
          $executeRaw: jest.Mock;
          $queryRaw: jest.Mock;
        }) => unknown,
      ) => callback({ retrievalChunk, $executeRaw, $queryRaw }),
    ),
  } as never);

  await repository.writeEmbedding({
    tenantId: 'tenant-1',
    entityType: 'knowledge',
    entityId: 'asset-1:1',
    content: 'Withdrawn content.',
    metadata: { assetId: 'asset-1', sequence: 1 },
    embeddingVersion: 'v1',
    vector: Array.from({ length: 1536 }, () => 0.1),
  });

  expect(retrievalChunk.upsert).not.toHaveBeenCalled();
});

test('refuses a knowledge projection that has no source asset identity', async () => {
  const retrievalChunk = { upsert: jest.fn().mockResolvedValue({ id: 'chunk-1' }) };
  const $executeRaw = jest.fn();
  const repository = new RetrievalRepository({ retrievalChunk, $executeRaw } as never);

  await repository.writeEmbedding({
    tenantId: 'tenant-1',
    entityType: 'knowledge',
    entityId: 'asset-1:1',
    content: 'Unattributed content.',
    metadata: { source: 'unknown' },
    embeddingVersion: 'v1',
    vector: Array.from({ length: 1536 }, () => 0.1),
  });

  expect(retrievalChunk.upsert).not.toHaveBeenCalled();
});

test('records only a query hash and hit identifiers in retrieval logs', async () => {
  const retrievalLog = { create: jest.fn().mockResolvedValue({}) };
  const repository = new RetrievalRepository({ retrievalLog } as never);

  await repository.recordLog({
    tenantId: 'tenant-1',
    userId: 'user-1',
    purpose: 'training',
    queryHash: 'hash-only',
    hitIds: ['chunk-1'],
    policyVersion: 'v1',
    latencyMs: 12,
    traceId: 'trace-1',
  });

  expect(retrievalLog.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ queryHash: 'hash-only', hitIds: ['chunk-1'] }),
  });
});

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chunk-1',
    tenantId: 'tenant-1',
    entityType: 'knowledge',
    entityId: 'asset-1',
    content: 'Event sourcing supports replay.',
    metadata: {},
    score: 0.5,
    ...overrides,
  };
}

function sqlText(queryRaw: jest.Mock) {
  const query = queryRaw.mock.calls[0]?.[0] as { strings?: TemplateStringsArray } | undefined;
  return query?.strings?.join('') ?? '';
}
