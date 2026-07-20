import { Injectable } from '@nestjs/common';
import type { ModelProvider } from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { CredentialCryptoService } from './credential-crypto.service';
import { ModelCredentialInfrastructure } from './model-credential-infrastructure';
import type { ResolvedModelCredential } from './model-credential.service';

type ResolvedModelCredentialMetadata = Omit<ResolvedModelCredential, 'apiKey'>;

@Injectable()
export class ModelCredentialResolver {
  constructor(
    private readonly infrastructure: ModelCredentialInfrastructure,
    private readonly crypto: CredentialCryptoService,
  ) {}

  async resolveDefaultMetadata(
    context: ProductRequestContext,
  ): Promise<ResolvedModelCredentialMetadata | null> {
    this.infrastructure.policy.assert(context.actor, 'model_credential:read', {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
    const current = await this.infrastructure.prisma.userModelCredential.findFirst({
      where: {
        tenantId: context.tenantId,
        userId: context.actor.id,
        isDefault: true,
        status: 'verified',
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, provider: true, model: true, baseUrl: true },
    });
    if (!current) return null;
    return { ...current, provider: current.provider as ModelProvider };
  }

  async resolveForInvocation(input: {
    tenantId: string;
    userId: string;
    credentialId: string;
  }): Promise<ResolvedModelCredential | null> {
    const current = await this.infrastructure.prisma.userModelCredential.findFirst({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        id: input.credentialId,
        status: 'verified',
      },
    });
    if (!current) return null;
    return {
      id: current.id,
      provider: current.provider as ModelProvider,
      model: current.model,
      baseUrl: current.baseUrl,
      apiKey: this.crypto.decrypt(current),
    };
  }
}
