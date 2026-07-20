import { Injectable } from '@nestjs/common';
import type { ModelProvider } from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { AiInvocationService } from '../ai-usage/ai-invocation.service';
import { ModelProviderClient } from './model-provider.client';

export type ModelCredentialConnection = {
  id: string;
  provider: string;
  model: string;
  baseUrl: string | null;
};

@Injectable()
export class ModelCredentialConnectionTester {
  constructor(
    private readonly provider: ModelProviderClient,
    private readonly invocations: AiInvocationService,
  ) {}

  test(
    context: ProductRequestContext,
    credential: ModelCredentialConnection,
    apiKey: string,
  ): Promise<void> {
    return this.invocations.measure(invocationMetadata(context, credential), (onUsage) =>
      this.provider.testConnection({
        provider: credential.provider as ModelProvider,
        model: credential.model,
        baseUrl: credential.baseUrl,
        apiKey,
        onUsage,
      }),
    );
  }
}

function invocationMetadata(
  context: ProductRequestContext,
  credential: Pick<ModelCredentialConnection, 'id' | 'provider' | 'model'>,
) {
  return {
    tenantId: context.tenantId,
    userId: context.actor.id,
    credentialId: credential.id,
    operation: 'model_connection_test' as const,
    provider: credential.provider as ModelProvider,
    model: credential.model,
    traceId: context.traceId,
  };
}
