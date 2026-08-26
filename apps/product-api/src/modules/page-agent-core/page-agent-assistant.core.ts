import { BadGatewayException, BadRequestException } from '@nestjs/common';
import type { AiInvocationOperation } from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { AiInvocationService } from '../ai-usage/ai-invocation.service';
import { modelRequestLimits } from '../ai-usage/ai-budget-policy';
import {
  ModelCredentialService,
  type ResolvedModelCredential,
} from '../model-credential/model-credential.service';
import { ModelProviderClient, ModelProviderError } from '../model-credential/model-provider.client';
import {
  PAGE_AGENT_REQUEST_TOO_LARGE,
  PageAgentConfigSchema,
  parsePageAgentCompletion,
  sanitizedPageAgentBody,
  type PageAgentCompletionRequest,
  type PageAgentConfig,
} from './page-agent.schemas';

export type PageAgentAssistantCopy = {
  configConnectMessage: string;
  configUnsupportedMessage: string;
  invalidRequestCode: string;
  requestTooLargeMessage: string;
  requestInvalidMessage: string;
  connectionRequiredMessage: string;
  unsupportedProviderCode: string;
  unsupportedProviderMessage: string;
  unavailableMessage: string;
};

export type PageAgentAssistantBinding = {
  operation: AiInvocationOperation;
  copy: PageAgentAssistantCopy;
};

export type PageAgentAssistantDependencies = {
  credentials: ModelCredentialService;
  provider: ModelProviderClient;
  invocations: AiInvocationService;
};

export class PageAgentAssistantCore {
  constructor(
    private readonly deps: PageAgentAssistantDependencies,
    private readonly binding: PageAgentAssistantBinding,
  ) {}

  async config(context: ProductRequestContext): Promise<PageAgentConfig> {
    const credential = await this.deps.credentials.resolveDefault(context);
    const supported = credential?.provider !== 'anthropic';
    return PageAgentConfigSchema.parse({
      enabled: Boolean(credential && supported),
      model: credential?.model ?? null,
      provider: credential?.provider ?? null,
      message: !credential
        ? this.binding.copy.configConnectMessage
        : supported
          ? null
          : this.binding.copy.configUnsupportedMessage,
    });
  }

  async completion(context: ProductRequestContext, body: unknown) {
    const request = this.parseRequest(body);
    const credential = await this.deps.credentials.resolveDefault(context);
    if (!credential) throw this.connectionRequired();
    if (credential.provider === 'anthropic') throw this.unsupportedProvider();
    try {
      return await this.invoke(context, credential, request);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof BadGatewayException) throw error;
      const code = error instanceof ModelProviderError ? error.code : 'MODEL_PROVIDER_UNAVAILABLE';
      throw new BadGatewayException({ code, message: this.binding.copy.unavailableMessage });
    }
  }

  private invoke(
    context: ProductRequestContext,
    credential: ResolvedModelCredential,
    request: PageAgentCompletionRequest,
  ) {
    return this.deps.invocations.measure(
      {
        tenantId: context.tenantId,
        userId: context.actor.id,
        credentialId: credential.id,
        operation: this.binding.operation,
        provider: credential.provider,
        model: credential.model,
        traceId: context.traceId,
        inputCharacters: JSON.stringify(request).length,
      },
      (onUsage, budget) =>
        this.deps.provider.invokeCompatible(
          {
            ...credential,
            requestBody: sanitizedPageAgentBody(request, credential.model),
            ...modelRequestLimits(budget),
          },
          onUsage,
        ),
    );
  }

  private parseRequest(body: unknown): PageAgentCompletionRequest {
    try {
      return parsePageAgentCompletion(body);
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === PAGE_AGENT_REQUEST_TOO_LARGE;
      throw new BadRequestException({
        code: this.binding.copy.invalidRequestCode,
        message: tooLarge
          ? this.binding.copy.requestTooLargeMessage
          : this.binding.copy.requestInvalidMessage,
      });
    }
  }

  private connectionRequired() {
    return new BadRequestException({
      code: 'MODEL_CONNECTION_REQUIRED',
      message: this.binding.copy.connectionRequiredMessage,
    });
  }

  private unsupportedProvider() {
    return new BadRequestException({
      code: this.binding.copy.unsupportedProviderCode,
      message: this.binding.copy.unsupportedProviderMessage,
    });
  }
}
