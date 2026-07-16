import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ModelCredentialListSchema,
  ModelCredentialViewSchema,
  type CreateModelCredentialInput,
  type ModelCredentialView,
  type ModelProvider,
  type UpdateModelCredentialInput,
} from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { CredentialCryptoService } from './credential-crypto.service';
import { ModelCredentialInfrastructure } from './model-credential-infrastructure';
import { ModelProviderClient } from './model-provider.client';

const KEY_HINT_VISIBLE_CHARACTERS = 4;

export type ResolvedModelCredential = {
  id: string;
  provider: ModelProvider;
  model: string;
  baseUrl: string | null;
  apiKey: string;
};

@Injectable()
export class ModelCredentialService {
  constructor(
    private readonly infrastructure: ModelCredentialInfrastructure,
    private readonly crypto: CredentialCryptoService,
    private readonly provider: ModelProviderClient,
  ) {}

  async list(context: ProductRequestContext): Promise<ModelCredentialView[]> {
    this.assertAccess(context, 'model_credential:read');
    const records = await this.infrastructure.prisma.userModelCredential.findMany({
      where: ownerScope(context),
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return ModelCredentialListSchema.parse(records.map(mapCredential));
  }

  async create(
    context: ProductRequestContext,
    input: CreateModelCredentialInput,
  ): Promise<ModelCredentialView> {
    this.assertAccess(context, 'model_credential:write');
    const encrypted = this.crypto.encrypt(input.apiKey);
    const keyHint = maskedKey(input.apiKey);
    return this.infrastructure.prisma.$transaction(async (transaction) => {
      if (input.isDefault) await clearDefault(transaction, context);
      const stored = await transaction.userModelCredential.create({
        data: {
          ...ownerScope(context),
          provider: input.provider,
          model: input.model,
          baseUrl: input.baseUrl ?? null,
          ...encrypted,
          keyHint,
          isDefault: input.isDefault,
        },
      });
      await this.infrastructure.audit.record(
        context,
        auditEvent('create', stored.id, input),
        transaction,
      );
      return ModelCredentialViewSchema.parse(mapCredential(stored));
    }, serializable());
  }

  async update(
    context: ProductRequestContext,
    credentialId: string,
    input: UpdateModelCredentialInput,
  ): Promise<ModelCredentialView> {
    this.assertAccess(context, 'model_credential:write');
    return this.infrastructure.prisma.$transaction(async (transaction) => {
      const current = await findOwned(transaction, context, credentialId);
      if (!current) throw credentialNotFound();
      if (input.isDefault) await clearDefault(transaction, context);
      const secretData = input.apiKey ? encryptedUpdate(this.crypto, input.apiKey) : {};
      const stored = await transaction.userModelCredential.update({
        where: { tenantId_id: { tenantId: context.tenantId, id: credentialId } },
        data: { ...secretData, ...plainUpdate(input) },
      });
      await this.infrastructure.audit.record(
        context,
        auditEvent('update', stored.id, stored),
        transaction,
      );
      return ModelCredentialViewSchema.parse(mapCredential(stored));
    }, serializable());
  }

  async remove(context: ProductRequestContext, credentialId: string): Promise<void> {
    this.assertAccess(context, 'model_credential:write');
    await this.infrastructure.prisma.$transaction(async (transaction) => {
      const current = await findOwned(transaction, context, credentialId);
      if (!current) throw credentialNotFound();
      await transaction.userModelCredential.delete({
        where: { tenantId_id: { tenantId: context.tenantId, id: credentialId } },
      });
      await this.infrastructure.audit.record(
        context,
        auditEvent('delete', credentialId, current),
        transaction,
      );
    }, serializable());
  }

  async resolveDefault(context: ProductRequestContext): Promise<ResolvedModelCredential | null> {
    this.assertAccess(context, 'model_credential:read');
    const current = await this.infrastructure.prisma.userModelCredential.findFirst({
      where: { ...ownerScope(context), isDefault: true, status: 'verified' },
      orderBy: { updatedAt: 'desc' },
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

  async testConnection(
    context: ProductRequestContext,
    credentialId: string,
  ): Promise<ModelCredentialView> {
    this.assertAccess(context, 'model_credential:test');
    const current = await this.infrastructure.prisma.userModelCredential.findFirst({
      where: { ...ownerScope(context), id: credentialId },
    });
    if (!current) throw credentialNotFound();
    await this.provider.testConnection({
      provider: current.provider as ModelProvider,
      model: current.model,
      baseUrl: current.baseUrl,
      apiKey: this.crypto.decrypt(current),
    });
    return this.infrastructure.prisma.$transaction(async (transaction) => {
      const stored = await transaction.userModelCredential.update({
        where: { tenantId_id: { tenantId: context.tenantId, id: credentialId } },
        data: { status: 'verified', lastTestedAt: new Date(), lastErrorCode: null },
      });
      await this.infrastructure.audit.record(
        context,
        auditEvent('test', stored.id, stored),
        transaction,
      );
      return ModelCredentialViewSchema.parse(mapCredential(stored));
    }, serializable());
  }

  private assertAccess(
    context: ProductRequestContext,
    action: 'model_credential:read' | 'model_credential:write' | 'model_credential:test',
  ) {
    this.infrastructure.policy.assert(context.actor, action, {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
  }
}

function ownerScope(context: ProductRequestContext) {
  return { tenantId: context.tenantId, userId: context.actor.id };
}

function maskedKey(value: string) {
  return `••••${value.slice(-KEY_HINT_VISIBLE_CHARACTERS)}`;
}

function encryptedUpdate(crypto: CredentialCryptoService, apiKey: string) {
  return { ...crypto.encrypt(apiKey), keyHint: maskedKey(apiKey), status: 'unverified' };
}

function plainUpdate(input: UpdateModelCredentialInput) {
  return {
    ...(input.model ? { model: input.model } : {}),
    ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
    ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
}

function clearDefault(transaction: Prisma.TransactionClient, context: ProductRequestContext) {
  return transaction.userModelCredential.updateMany({
    where: { ...ownerScope(context), isDefault: true },
    data: { isDefault: false },
  });
}

function findOwned(transaction: Prisma.TransactionClient, context: ProductRequestContext, id: string) {
  return transaction.userModelCredential.findFirst({ where: { ...ownerScope(context), id } });
}

function mapCredential(record: {
  id: string;
  provider: string;
  model: string;
  baseUrl: string | null;
  keyHint: string;
  status: string;
  isDefault: boolean;
  lastTestedAt: Date | null;
  lastErrorCode: string | null;
  updatedAt: Date;
}) {
  return {
    ...record,
    provider: record.provider as ModelProvider,
    status: record.status as ModelCredentialView['status'],
    lastTestedAt: record.lastTestedAt?.toISOString() ?? null,
    updatedAt: record.updatedAt.toISOString(),
  };
}

function auditEvent(action: string, credentialId: string, record: { provider: string; model: string }) {
  return {
    action: `model_credential.${action}`,
    resourceType: 'UserModelCredential',
    resourceId: credentialId,
    metadata: { provider: record.provider, model: record.model },
  };
}

function serializable() {
  return { isolationLevel: 'Serializable' as const };
}

function credentialNotFound() {
  return new NotFoundException('模型连接不存在。');
}
