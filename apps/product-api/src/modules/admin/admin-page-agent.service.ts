import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import type { ProductRequestContext } from '../../common/context/request-context';
import { AiInvocationService } from '../ai-usage/ai-invocation.service';
import { ModelCredentialService } from '../model-credential/model-credential.service';
import { ModelProviderClient, ModelProviderError } from '../model-credential/model-provider.client';
import {
  PageAgentConfigSchema,
  parsePageAgentCompletion,
  sanitizedPageAgentBody,
  type PageAgentCompletionRequest,
  type PageAgentConfig,
} from './admin-page-agent.schemas';

@Injectable()
export class AdminPageAgentService {
  constructor(
    private readonly credentials: ModelCredentialService,
    private readonly provider: ModelProviderClient,
    private readonly invocations: AiInvocationService,
  ) {}

  async config(context: ProductRequestContext): Promise<PageAgentConfig> {
    const credential = await this.credentials.resolveDefault(context);
    const supported = credential?.provider !== 'anthropic';
    return PageAgentConfigSchema.parse({
      enabled: Boolean(credential && supported),
      model: credential?.model ?? null,
      provider: credential?.provider ?? null,
      message: !credential
        ? '请先为当前后台账号配置并测试一个模型连接。'
        : supported
          ? null
          : '后台 Agent 需要 OpenAI 兼容的模型连接，请切换到 OpenAI、Qwen、DeepSeek 或兼容端点。',
    });
  }

  async completion(context: ProductRequestContext, body: unknown) {
    let request: PageAgentCompletionRequest;
    try {
      request = parsePageAgentCompletion(body);
    } catch (error) {
      throw new BadRequestException({
        code: 'PAGE_AGENT_REQUEST_INVALID',
        message:
          error instanceof Error && error.message === 'PAGE_AGENT_REQUEST_TOO_LARGE'
            ? '助手请求内容过大，请缩短问题或关闭不必要的页面内容。'
            : '助手请求格式无效，请重试。',
      });
    }
    const credential = await this.credentials.resolveDefault(context);
    if (!credential) throw connectionRequired();
    if (credential.provider === 'anthropic') throw unsupportedProvider();
    try {
      return await this.invocations.measure(
        {
          tenantId: context.tenantId,
          userId: context.actor.id,
          credentialId: credential.id,
          operation: 'admin_page_agent',
          provider: credential.provider,
          model: credential.model,
          traceId: context.traceId,
        },
        (onUsage) =>
          this.provider.invokeCompatible(
            {
              ...credential,
              requestBody: sanitizedPageAgentBody(request, credential.model),
            },
            onUsage,
          ),
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const code = error instanceof ModelProviderError ? error.code : 'MODEL_PROVIDER_UNAVAILABLE';
      throw new BadGatewayException({
        code,
        message: '后台 Agent 模型暂时不可用，请检查模型连接或稍后重试。',
      });
    }
  }
}

function connectionRequired() {
  return new BadRequestException({
    code: 'MODEL_CONNECTION_REQUIRED',
    message: '请先配置并测试一个模型连接，再使用后台 Agent 助手。',
  });
}

function unsupportedProvider() {
  return new BadRequestException({
    code: 'PAGE_AGENT_PROVIDER_UNSUPPORTED',
    message:
      '后台 Agent 当前需要 OpenAI 兼容的模型连接，请切换到 OpenAI、Qwen、DeepSeek 或兼容端点。',
  });
}
