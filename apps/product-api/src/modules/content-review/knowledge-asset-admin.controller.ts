import { Controller, Param, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { KnowledgeAssetLifecycleService } from './knowledge-asset-lifecycle.service';

@Roles('admin')
@Controller('admin/knowledge-assets')
export class KnowledgeAssetAdminController {
  constructor(private readonly lifecycle: KnowledgeAssetLifecycleService) {}

  @Post(':assetId/publish')
  publish(@Req() request: ProductRequest, @Param('assetId') assetId: string) {
    return this.lifecycle.publish(request.context, assetId);
  }

  @Post(':assetId/unpublish')
  unpublish(@Req() request: ProductRequest, @Param('assetId') assetId: string) {
    return this.lifecycle.unpublish(request.context, assetId);
  }
}
