import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AvailableModel,
  DiscoverAvailableModelsInput,
  ModelProvider,
} from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { CredentialCryptoService } from './credential-crypto.service';
import { ModelCredentialConnectionTester } from './model-credential-connection-tester';
import { ModelCredentialInfrastructure } from './model-credential-infrastructure';
import { ModelProviderError } from './model-provider.client';

type CatalogTarget = { provider: ModelProvider; baseUrl: string | null; apiKey: string };

/** 读取服务商模型目录：让用户在设置页里挑选模型，而不是手写模型名称。 */
@Injectable()
export class ModelCredentialCatalogService {
  constructor(
    private readonly infrastructure: ModelCredentialInfrastructure,
    private readonly crypto: CredentialCryptoService,
    private readonly connectionTester: ModelCredentialConnectionTester,
  ) {}

  async discover(
    context: ProductRequestContext,
    input: DiscoverAvailableModelsInput,
  ): Promise<AvailableModel[]> {
    this.infrastructure.policy.assert(context.actor, 'model_credential:test', {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
    const target = await this.catalogTarget(context, input);
    try {
      return await this.connectionTester.listModels(target, target.apiKey);
    } catch (error) {
      throw catalogFailure(error);
    }
  }

  private async catalogTarget(
    context: ProductRequestContext,
    input: DiscoverAvailableModelsInput,
  ): Promise<CatalogTarget> {
    if (!input.credentialId) {
      if (!input.apiKey) throw catalogFailure(new ModelProviderError('MODEL_PROVIDER_AUTH_FAILED'));
      return { provider: input.provider, baseUrl: input.baseUrl ?? null, apiKey: input.apiKey };
    }
    const stored = await this.infrastructure.prisma.userModelCredential.findFirst({
      where: { tenantId: context.tenantId, userId: context.actor.id, id: input.credentialId },
    });
    if (!stored) throw new NotFoundException('模型连接不存在。');
    return {
      provider: input.provider,
      baseUrl: input.baseUrl !== undefined ? input.baseUrl : stored.baseUrl,
      apiKey: input.apiKey ?? this.crypto.decrypt(stored),
    };
  }
}

function catalogFailure(error: unknown) {
  const code = error instanceof ModelProviderError ? error.code : 'MODEL_CATALOG_FAILED';
  return new BadGatewayException({ code, message: catalogErrorMessage(code) });
}

function catalogErrorMessage(code: string) {
  if (code === 'MODEL_PROVIDER_AUTH_FAILED') {
    return '模型服务拒绝了当前密钥，无法获取模型列表。';
  }
  if (code === 'MODEL_PROVIDER_RATE_LIMITED') {
    return '模型服务当前请求过多，请稍后再获取模型列表。';
  }
  if (code === 'MODEL_BASE_URL_REQUIRED') {
    return '自定义模型连接缺少 Base URL，无法获取模型列表。';
  }
  if (code === 'MODEL_PROVIDER_TIMEOUT') {
    return '获取模型列表超时，请稍后重试。';
  }
  return '获取模型列表失败，请检查服务商、端点和密钥后重试。';
}
