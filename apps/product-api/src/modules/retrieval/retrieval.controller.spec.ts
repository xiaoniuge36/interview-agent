import { RetrievalController } from './retrieval.controller';

test('validates a retrieval request before handing it to the tenant-scoped service', async () => {
  const service = { search: jest.fn().mockResolvedValue({ hits: [] }) };
  const controller = new RetrievalController(service as never);
  const request = { context: { tenantId: 'tenant-1' } };

  await expect(
    controller.search(request as never, { query: 'memory consistency', purpose: 'training' }),
  ).resolves.toEqual({ hits: [] });

  expect(service.search).toHaveBeenCalledWith(
    request.context,
    expect.objectContaining({ query: 'memory consistency', limit: 8 }),
  );
});
