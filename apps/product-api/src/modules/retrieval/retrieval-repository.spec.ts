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
