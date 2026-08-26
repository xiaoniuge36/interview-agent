import { Injectable } from '@nestjs/common';
import { AiInvocationService } from '../ai-usage/ai-invocation.service';
import { ModelCredentialService } from '../model-credential/model-credential.service';
import { ModelProviderClient } from '../model-credential/model-provider.client';
import {
  PageAgentAssistantCore,
  type PageAgentAssistantBinding,
} from '../page-agent-core/page-agent-assistant.core';

const ADMIN_PAGE_AGENT_BINDING: PageAgentAssistantBinding = {
  operation: 'admin_page_agent',
  copy: {
    configConnectMessage: '请先为当前后台账号配置并测试一个模型连接。',
    configUnsupportedMessage:
      '后台 Agent 需要 OpenAI 兼容的模型连接，请切换到 OpenAI、Qwen、DeepSeek 或兼容端点。',
    invalidRequestCode: 'PAGE_AGENT_REQUEST_INVALID',
    requestTooLargeMessage: '助手请求内容过大，请缩短问题或关闭不必要的页面内容。',
    requestInvalidMessage: '助手请求格式无效，请重试。',
    connectionRequiredMessage: '请先配置并测试一个模型连接，再使用后台 Agent 助手。',
    unsupportedProviderCode: 'PAGE_AGENT_PROVIDER_UNSUPPORTED',
    unsupportedProviderMessage:
      '后台 Agent 当前需要 OpenAI 兼容的模型连接，请切换到 OpenAI、Qwen、DeepSeek 或兼容端点。',
    unavailableMessage: '后台 Agent 模型暂时不可用，请检查模型连接或稍后重试。',
  },
};

@Injectable()
export class AdminPageAgentService extends PageAgentAssistantCore {
  constructor(
    credentials: ModelCredentialService,
    provider: ModelProviderClient,
    invocations: AiInvocationService,
  ) {
    super({ credentials, provider, invocations }, ADMIN_PAGE_AGENT_BINDING);
  }
}
