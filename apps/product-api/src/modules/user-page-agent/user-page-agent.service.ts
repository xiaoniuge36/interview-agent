import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import type { ProductRequestContext } from '../../common/context/request-context';
import { AiInvocationService } from '../ai-usage/ai-invocation.service';
import { ModelCredentialService } from '../model-credential/model-credential.service';
import { ModelProviderClient, ModelProviderError } from '../model-credential/model-provider.client';
import {
  parseUserPageAgentCompletion,
  sanitizedUserPageAgentBody,
  UserPageAgentConfigSchema,
  type UserPageAgentConfig,
} from './user-page-agent.schemas';

@Injectable()
export class UserPageAgentService {
  constructor(
    private readonly credentials: ModelCredentialService,
    private readonly provider: ModelProviderClient,
    private readonly invocations: AiInvocationService,
  ) {}

  async config(context: ProductRequestContext): Promise<UserPageAgentConfig> {
    const credential = await this.credentials.resolveDefault(context);
    const supported = credential?.provider !== 'anthropic';
    return UserPageAgentConfigSchema.parse({
      enabled: Boolean(credential && supported),
      model: credential?.model ?? null,
      provider: credential?.provider ?? null,
      message: !credential
        ? '请先连接一个 AI 模型，刷题教练才能开始工作。'
        : supported
          ? null
          : '刷题教练需要 OpenAI 兼容的模型连接，请切换到兼容端点。',
    });
  }

  async completion(context: ProductRequestContext, body: unknown) {
    const request = this.parseRequest(body);
    const credential = await this.credentials.resolveDefault(context);
    if (!credential) throw connectionRequired();
    if (credential.provider === 'anthropic') throw unsupportedProvider();
    try {
      return await this.invocations.measure(
        {
          tenantId: context.tenantId,
          userId: context.actor.id,
          credentialId: credential.id,
          operation: 'user_page_agent',
          provider: credential.provider,
          model: credential.model,
          traceId: context.traceId,
        },
        (onUsage) =>
          this.provider.invokeCompatible(
            {
              ...credential,
              requestBody: sanitizedUserPageAgentBody(request, credential.model),
            },
            onUsage,
          ),
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const code = error instanceof ModelProviderError ? error.code : 'MODEL_PROVIDER_UNAVAILABLE';
      throw new BadGatewayException({
        code,
        message: '刷题教练模型暂时不可用，请检查模型连接或稍后重试。',
      });
    }
  }

  private parseRequest(body: unknown) {
    try {
      return parseUserPageAgentCompletion(body);
    } catch (error) {
      throw new BadRequestException({
        code: 'USER_PAGE_AGENT_REQUEST_INVALID',
        message:
          error instanceof Error && error.message === 'USER_PAGE_AGENT_REQUEST_TOO_LARGE'
            ? '刷题教练请求内容过大，请缩短问题后重试。'
            : '刷题教练请求格式无效，请重试。',
      });
    }
  }
}

function connectionRequired() {
  return new BadRequestException({
    code: 'MODEL_CONNECTION_REQUIRED',
    message: '请先在设置中心连接并测试一个 AI 模型，再使用刷题教练。',
  });
}

function unsupportedProvider() {
  return new BadRequestException({
    code: 'USER_PAGE_AGENT_PROVIDER_UNSUPPORTED',
    message: '刷题教练当前需要 OpenAI 兼容的模型连接，请切换模型端点。',
  });
}
