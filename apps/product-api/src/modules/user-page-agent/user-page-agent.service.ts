import { Injectable } from '@nestjs/common';
import { AiInvocationService } from '../ai-usage/ai-invocation.service';
import { ModelCredentialService } from '../model-credential/model-credential.service';
import { ModelProviderClient } from '../model-credential/model-provider.client';
import {
  PageAgentAssistantCore,
  type PageAgentAssistantBinding,
} from '../page-agent-core/page-agent-assistant.core';

const USER_PAGE_AGENT_BINDING: PageAgentAssistantBinding = {
  operation: 'user_page_agent',
  copy: {
    configConnectMessage: '请先连接一个 AI 模型，刷题教练才能开始工作。',
    configUnsupportedMessage: '刷题教练需要 OpenAI 兼容的模型连接，请切换到兼容端点。',
    invalidRequestCode: 'USER_PAGE_AGENT_REQUEST_INVALID',
    requestTooLargeMessage: '刷题教练请求内容过大，请缩短问题后重试。',
    requestInvalidMessage: '刷题教练请求格式无效，请重试。',
    connectionRequiredMessage: '请先在设置中心连接并测试一个 AI 模型，再使用刷题教练。',
    unsupportedProviderCode: 'USER_PAGE_AGENT_PROVIDER_UNSUPPORTED',
    unsupportedProviderMessage: '刷题教练当前需要 OpenAI 兼容的模型连接，请切换模型端点。',
    unavailableMessage: '刷题教练模型暂时不可用，请检查模型连接或稍后重试。',
  },
};

@Injectable()
export class UserPageAgentService extends PageAgentAssistantCore {
  constructor(
    credentials: ModelCredentialService,
    provider: ModelProviderClient,
    invocations: AiInvocationService,
  ) {
    super({ credentials, provider, invocations }, USER_PAGE_AGENT_BINDING);
  }
}
