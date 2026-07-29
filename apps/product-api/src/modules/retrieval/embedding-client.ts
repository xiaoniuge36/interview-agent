import { Injectable } from '@nestjs/common';
import { AiInvocationService } from '../ai-usage/ai-invocation.service';
import { modelRequestLimits } from '../ai-usage/ai-budget-policy';
import { ModelCredentialResolver } from '../model-credential/model-credential-resolver';
import { ModelProviderClient } from '../model-credential/model-provider.client';

export type EmbeddingRequest = {
  tenantId: string;
  userId: string;
  traceId: string;
  text: string;
};

@Injectable()
export class EmbeddingClient {
  constructor(
    private readonly credentials: ModelCredentialResolver,
    private readonly provider: ModelProviderClient,
    private readonly invocations: AiInvocationService,
  ) {}

  async embed(input: EmbeddingRequest): Promise<number[] | null> {
    const credential = await this.credentials.resolveDefaultForInvocation(input);
    if (!credential) return null;
    const vectors = await this.invocations.measure(
      {
        tenantId: input.tenantId,
        userId: input.userId,
        credentialId: credential.id,
        operation: 'embedding',
        provider: credential.provider,
        model: credential.model,
        traceId: input.traceId,
        inputCharacters: input.text.length,
      },
      (_onUsage, budget) =>
        this.provider.embed({ ...credential, ...modelRequestLimits(budget) }, [input.text]),
    );
    return vectors[0] ?? null;
  }
}
