import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { CONTRACT_LIMITS } from '@interview-agent/contracts';
import type { Environment } from '../../common/config/environment';
import type { ProductRequestContext } from '../../common/context/request-context';
import { ModelCredentialResolver } from '../model-credential/model-credential-resolver';

const GRANT_TTL_MS = 30_000;
const EXPECTED_TOKEN_PARTS = 2;

const ModelInvocationGrantPayloadSchema = z.object({
  grantId: z.string().uuid(),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  credentialId: z.string().min(1),
  sessionId: z.string().min(1),
  commandId: z.string().min(1),
  operation: z.literal('interview_next'),
  traceId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
  expiresAt: z.string().datetime(),
});

export type ModelInvocationGrantPayload = z.infer<typeof ModelInvocationGrantPayloadSchema>;

@Injectable()
export class ModelInvocationGrantService {
  private readonly signingSecret: string;

  constructor(
    config: ConfigService<Environment, true>,
    private readonly credentials: ModelCredentialResolver,
  ) {
    this.signingSecret = config.get('INTERNAL_AGENT_TOKEN', { infer: true });
  }

  async issue(
    context: ProductRequestContext,
    input: { sessionId: string; commandId: string; traceId: string },
  ): Promise<string> {
    const credential = await this.credentials.resolveDefaultMetadata(context);
    if (!credential) throw connectionRequired();
    const payload = ModelInvocationGrantPayloadSchema.parse({
      grantId: randomUUID(),
      tenantId: context.tenantId,
      userId: context.actor.id,
      credentialId: credential.id,
      sessionId: input.sessionId,
      commandId: input.commandId,
      operation: 'interview_next',
      traceId: input.traceId,
      expiresAt: new Date(Date.now() + GRANT_TTL_MS).toISOString(),
    });
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${encoded}.${this.signature(encoded)}`;
  }

  verify(token: string): ModelInvocationGrantPayload {
    const parts = token.split('.');
    if (parts.length !== EXPECTED_TOKEN_PARTS) throw invalidGrant();
    const [encoded, signature] = parts;
    if (!encoded || !signature || !secureEqual(signature, this.signature(encoded))) {
      throw invalidGrant();
    }
    const payload = parsePayload(encoded);
    if (Date.parse(payload.expiresAt) <= Date.now()) throw expiredGrant();
    return payload;
  }

  private signature(encoded: string): string {
    return createHmac('sha256', this.signingSecret).update(encoded).digest('base64url');
  }
}

function parsePayload(encoded: string): ModelInvocationGrantPayload {
  try {
    return ModelInvocationGrantPayloadSchema.parse(
      JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')),
    );
  } catch {
    throw invalidGrant();
  }
}

function secureEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function invalidGrant() {
  return new UnauthorizedException({
    code: 'MODEL_INVOCATION_GRANT_INVALID',
    message: '模型调用授权无效。',
  });
}

function expiredGrant() {
  return new UnauthorizedException({
    code: 'MODEL_INVOCATION_GRANT_EXPIRED',
    message: '模型调用授权已过期。',
  });
}

function connectionRequired() {
  return new BadRequestException({
    code: 'MODEL_CONNECTION_REQUIRED',
    message: '请先在设置中心连接并测试一个 AI 模型，再开始模拟面试。',
  });
}
