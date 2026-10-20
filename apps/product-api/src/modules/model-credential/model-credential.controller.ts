import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import {
  CreateModelCredentialInputSchema,
  DiscoverAvailableModelsInputSchema,
  UpdateModelCredentialInputSchema,
} from '@interview-agent/contracts';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { AiThrottle } from '../../common/security/ai-throttle';
import { ModelCredentialCatalogService } from './model-credential-catalog.service';
import { ModelCredentialService } from './model-credential.service';

@Roles('user', 'admin', 'platform_admin')
@Controller('model-credentials')
export class ModelCredentialController {
  constructor(
    private readonly credentials: ModelCredentialService,
    private readonly catalog: ModelCredentialCatalogService,
  ) {}

  @Get()
  list(@Req() request: ProductRequest) {
    return this.credentials.list(request.context);
  }

  @Post()
  create(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.credentials.create(request.context, CreateModelCredentialInputSchema.parse(body));
  }

  @Patch(':credentialId')
  update(
    @Req() request: ProductRequest,
    @Param('credentialId') credentialId: string,
    @Body() body: unknown,
  ) {
    return this.credentials.update(
      request.context,
      credentialId,
      UpdateModelCredentialInputSchema.parse(body),
    );
  }

  @AiThrottle()
  @Post(':credentialId/test')
  test(@Req() request: ProductRequest, @Param('credentialId') credentialId: string) {
    return this.credentials.testConnection(request.context, credentialId);
  }

  @AiThrottle()
  @Post('available-models')
  availableModels(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.catalog.discover(request.context, DiscoverAvailableModelsInputSchema.parse(body));
  }

  @Delete(':credentialId')
  remove(@Req() request: ProductRequest, @Param('credentialId') credentialId: string) {
    return this.credentials.remove(request.context, credentialId);
  }
}
