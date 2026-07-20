import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { Public } from '../../common/authz/public.decorator';
import type { Environment } from '../../common/config/environment';
import { ModelGatewayRequestSchema } from './model-gateway.schemas';
import { ModelGatewayService } from './model-gateway.service';
import { ModelInvocationGrantService } from './model-invocation-grant.service';

@Public()
@Controller('internal/model-invocations')
export class ModelGatewayController {
  private readonly token: string;

  constructor(
    config: ConfigService<Environment, true>,
    private readonly grants: ModelInvocationGrantService,
    private readonly models: ModelGatewayService,
  ) {
    this.token = config.get('INTERNAL_AGENT_TOKEN', { infer: true });
  }

  @Post()
  async invoke(
    @Headers('x-internal-agent-token') token: string | undefined,
    @Headers('x-service-name') serviceName: string | undefined,
    @Body() body: unknown,
  ) {
    if (serviceName !== 'agent-runtime' || !token || !secureEqual(token, this.token)) {
      throw invalidServiceIdentity();
    }
    const request = ModelGatewayRequestSchema.parse(body);
    const grant = this.grants.verify(request.grant);
    return this.models.invoke(grant, request);
  }
}

function secureEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function invalidServiceIdentity() {
  return new UnauthorizedException({
    code: 'INVALID_SERVICE_IDENTITY',
    message: 'Internal service identity is invalid.',
  });
}
