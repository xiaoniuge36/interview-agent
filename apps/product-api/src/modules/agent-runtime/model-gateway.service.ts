import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import type { ModelProvider } from '@interview-agent/contracts';
import { withTraceSpan } from '../../common/telemetry/telemetry';
import { AiInvocationService } from '../ai-usage/ai-invocation.service';
import { ModelCredentialResolver } from '../model-credential/model-credential-resolver';
import { ModelProviderClient, ModelProviderError } from '../model-credential/model-provider.client';
import type { ModelGatewayRequest } from './model-gateway.schemas';
import type { ModelInvocationGrantPayload } from './model-invocation-grant.service';
import { modelRequestLimits } from '../ai-usage/ai-budget-policy';

@Injectable()
export class ModelGatewayService {
  constructor(
    private readonly resolver: ModelCredentialResolver,
    private readonly provider: ModelProviderClient,
    private readonly invocations: AiInvocationService,
  ) {}

  async invoke(grant: ModelInvocationGrantPayload, request: ModelGatewayRequest) {
    return withTraceSpan(
      'model_provider.complete',
      {
        'interview_agent.trace_id': request.traceId,
        operation: grant.operation,
        'output.schema_version': request.outputSchemaVersion,
      },
      () => this.invokeScoped(grant, request),
    );
  }

  private async invokeScoped(grant: ModelInvocationGrantPayload, request: ModelGatewayRequest) {
    if (grant.traceId !== request.traceId || !operationMatchesSchema(grant, request)) {
      throw invalidGrant();
    }
    const credential = await this.resolver.resolveForInvocation(grant);
    if (!credential) throw invalidGrant();
    try {
      const content = await this.invocations.measure(
        invocationMetadata(grant, credential, request),
        (onUsage, budget) =>
          this.provider.complete({
            ...credential,
            systemPrompt: request.systemPrompt,
            userPrompt: request.userPrompt,
            onUsage,
            ...modelRequestLimits(budget),
          }),
      );
      return { content };
    } catch (error) {
      throw providerFailure(error);
    }
  }
}

function operationMatchesSchema(grant: ModelInvocationGrantPayload, request: ModelGatewayRequest) {
  if (request.outputSchemaVersion === 'practice-report-runtime.v1') {
    return grant.operation === 'practice_report';
  }
  return grant.operation === 'interview_next';
}

function invalidGrant() {
  return new BadRequestException({
    code: 'MODEL_INVOCATION_GRANT_INVALID',
    message: '模型调用授权与当前请求不匹配。',
  });
}

function providerFailure(error: unknown) {
  if (error instanceof BadGatewayException || error instanceof BadRequestException) return error;
  const code = error instanceof ModelProviderError ? error.code : 'MODEL_PROVIDER_UNAVAILABLE';
  return new BadGatewayException({ code, message: '模型连接暂时不可用，请测试连接或稍后重试。' });
}

function invocationMetadata(
  grant: ModelInvocationGrantPayload,
  credential: { id: string; provider: ModelProvider; model: string },
  request: ModelGatewayRequest,
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
    inputCharacters: request.systemPrompt.length + request.userPrompt.length,
  };
}
