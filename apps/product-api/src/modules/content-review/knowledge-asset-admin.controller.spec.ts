import { KnowledgeAssetAdminController } from './knowledge-asset-admin.controller';
import { ROLES_METADATA_KEY } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';

test('exposes explicit administrator publish and unpublish asset actions', async () => {
  const lifecycle = {
    publish: jest.fn().mockResolvedValue({ id: 'asset-1', status: 'published' }),
    unpublish: jest.fn().mockResolvedValue({ id: 'asset-1', status: 'review' }),
  };
  const controller = new KnowledgeAssetAdminController(lifecycle as never);
  const request = { context: { tenantId: 'tenant-1' } } as unknown as ProductRequest;

  await controller.publish(request, 'asset-1');
  await controller.unpublish(request, 'asset-1');

  expect(lifecycle.publish).toHaveBeenCalledWith(request.context, 'asset-1');
  expect(lifecycle.unpublish).toHaveBeenCalledWith(request.context, 'asset-1');
});

test('restricts the asset lifecycle routes to administrators', () => {
  expect(Reflect.getMetadata(ROLES_METADATA_KEY, KnowledgeAssetAdminController)).toEqual(['admin']);
});
