import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import type { ModelProvider } from '@interview-agent/contracts';
import { AiInvocationService } from '../ai-usage/ai-invocation.service';
import { ModelCredentialResolver } from '../model-credential/model-credential-resolver';
import { ModelProviderClient, ModelProviderError } from '../model-credential/model-provider.client';
import type { ModelGatewayRequest } from './model-gateway.schemas';
import type { ModelInvocationGrantPayload } from './model-invocation-grant.service';

@Injectable()
export class ModelGatewayService {
  constructor(
    private readonly resolver: ModelCredentialResolver,
    private readonly provider: ModelProviderClient,
    private readonly invocations: AiInvocationService,
  ) {}

  async invoke(grant: ModelInvocationGrantPayload, request: ModelGatewayRequest) {
    if (grant.traceId !== request.traceId) throw invalidGrant();
    const credential = await this.resolver.resolveForInvocation(grant);
    if (!credential) throw invalidGrant();
    try {
      const content = await this.invocations.measure(
        invocationMetadata(grant, credential),
        (onUsage) =>
          this.provider.complete({
            ...credential,
            systemPrompt: request.systemPrompt,
            userPrompt: request.userPrompt,
            onUsage,
          }),
      );
      return { content };
    } catch (error) {
      throw providerFailure(error);
    }
  }
}

function invalidGrant() {
  return new BadRequestException({
    code: 'MODEL_INVOCATION_GRANT_INVALID',
    message: '模型调用授权与当前请求不匹配。',
  });
}

function providerFailure(error: unknown) {
  const code = error instanceof ModelProviderError ? error.code : 'MODEL_PROVIDER_UNAVAILABLE';
  return new BadGatewayException({ code, message: '模型连接暂时不可用，请测试连接或稍后重试。' });
}

function invocationMetadata(
  grant: ModelInvocationGrantPayload,
  credential: { id: string; provider: ModelProvider; model: string },
) {
  return {
    tenantId: grant.tenantId,
    userId: grant.userId,
    credentialId: credential.id,
    sessionId: grant.sessionId,
    operation: grant.operation,
    provider: credential.provider,
    model: credential.model,
    traceId: grant.traceId,
  };
}
