import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { withTraceSpan } from '../../common/telemetry/telemetry';
import { RetrievalService } from './retrieval.service';
import { RetrievalRepository } from './retrieval-repository';
import { EmbeddingClient } from './embedding-client';

jest.mock('../../common/telemetry/telemetry', () => ({
  withTraceSpan: jest.fn(
    (
      _name: string,
      _attributes: Record<string, unknown>,
      run: (span: {
        setAttributes: (attributes: Record<string, unknown>) => void;
      }) => Promise<unknown>,
    ) => run({ setAttributes: () => undefined }),
  ),
}));

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'user-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['practice:read'],
  },
};

test('publishes concrete Nest injection tokens for retrieval dependencies', () => {
  expect(Reflect.getMetadata('design:paramtypes', RetrievalService)).toEqual([
    RetrievalRepository,
    EmbeddingClient,
    PolicyService,
  ]);
});

test('keeps search results inside the request tenant and records a sanitized retrieval log', async () => {
  const repository = {
    searchKeyword: jest
      .fn()
      .mockResolvedValue([hit({ id: 'keyword-1', tenantId: context.tenantId, score: 0.7 })]),
    searchVector: jest
      .fn()
      .mockResolvedValue([hit({ id: 'other-tenant', tenantId: 'tenant-2', score: 0.9 })]),
    recordLog: jest.fn().mockResolvedValue(undefined),
  };
  const embeddings = { embed: jest.fn().mockResolvedValue([0.1]) };
  const service = new RetrievalService(
    repository as never,
    embeddings as never,
    new PolicyService(),
  );

  const result = await service.search(context, {
    query: 'sensitive interview answer',
    purpose: 'training',
    limit: 8,
  });

  expect(result.hits).toEqual([expect.objectContaining({ id: 'keyword-1', tenantId: 'tenant-1' })]);
  expect(repository.searchVector).toHaveBeenCalledWith(
    expect.objectContaining({
      tenantId: 'tenant-1',
      entityTypes: ['question', 'knowledge'],
    }),
    [0.1],
  );
  expect(repository.recordLog).toHaveBeenCalledWith(
    expect.objectContaining({ queryHash: expect.any(String), traceId: 'trace-1' }),
  );
  expect(JSON.stringify(repository.recordLog.mock.calls)).not.toContain(
    'sensitive interview answer',
  );
});

test('returns keyword fallback when embedding lookup is unavailable', async () => {
  const repository = {
    searchKeyword: jest.fn().mockResolvedValue([hit({ id: 'keyword-1', tenantId: 'tenant-1' })]),
    searchVector: jest.fn(),
    recordLog: jest.fn().mockResolvedValue(undefined),
  };
  const embeddings = { embed: jest.fn().mockResolvedValue(null) };
  const service = new RetrievalService(
    repository as never,
    embeddings as never,
    new PolicyService(),
  );

  const result = await service.search(context, {
    query: 'fallback',
    purpose: 'training',
    limit: 8,
  });

  expect(result.hits[0]).toMatchObject({ source: 'keyword' });
  expect(repository.searchVector).not.toHaveBeenCalled();
});

test('authorizes interview retrieval with interview read scope', async () => {
  const repository = {
    searchKeyword: jest.fn().mockResolvedValue([]),
    searchVector: jest.fn(),
    recordLog: jest.fn().mockResolvedValue(undefined),
  };
  const embeddings = { embed: jest.fn().mockResolvedValue(null) };
  const service = new RetrievalService(
    repository as never,
    embeddings as never,
    new PolicyService(),
  );
  const interviewContext: ProductRequestContext = {
    ...context,
    actor: { ...context.actor, scopes: ['interview:read'] },
  };

  await expect(
    service.search(interviewContext, { query: 'follow up', purpose: 'interview', limit: 8 }),
  ).resolves.toEqual({ hits: [] });
});

test('never places a confidential retrieval query in span or retrieval log attributes', async () => {
  const repository = {
    searchKeyword: jest.fn().mockResolvedValue([]),
    searchVector: jest.fn(),
    recordLog: jest.fn().mockResolvedValue(undefined),
  };
  const span = { setAttributes: jest.fn() };
  const traceSpan = withTraceSpan as jest.MockedFunction<typeof withTraceSpan>;
  traceSpan.mockImplementation((_name, _attributes, run) => run(span as never));
  const service = new RetrievalService(
    repository as never,
    { embed: jest.fn().mockResolvedValue(null) } as never,
    new PolicyService(),
  );
  const confidentialQuery = 'customer acquisition plan for confidential launch';

  await service.search(context, { query: confidentialQuery, purpose: 'training', limit: 8 });

  const traceAttributes = traceSpan.mock.calls.at(-1)?.[1] ?? {};
  const observed = JSON.stringify([traceAttributes, span.setAttributes.mock.calls]);
  expect(traceAttributes).toEqual({
    'interview_agent.trace_id': 'trace-1',
    'retrieval.purpose': 'training',
    'retrieval.query_hash': expect.any(String),
    'retrieval.query_length': confidentialQuery.length,
  });
  expect(observed).not.toContain(confidentialQuery);
  expect(observed).not.toContain('retrieval.query_preview');
  expect(observed).toContain('retrieval.hit_count');
  expect(observed).toContain('retrieval.latency_ms');
  expect(observed).not.toContain('retrieval.top_k');
  expect(span.setAttributes).toHaveBeenCalledWith({
    'retrieval.hit_count': 0,
    'retrieval.latency_ms': expect.any(Number),
  });
  expect(JSON.stringify(repository.recordLog.mock.calls)).not.toContain(confidentialQuery);
});

function hit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chunk-1',
    tenantId: 'tenant-1',
    entityType: 'knowledge',
    entityId: 'entity-1',
    content: 'Safe retrieval content.',
    metadata: {},
    score: 0.7,
    ...overrides,
  };
}
