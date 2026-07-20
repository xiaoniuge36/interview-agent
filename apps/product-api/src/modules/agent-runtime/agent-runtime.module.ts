import { Module } from '@nestjs/common';
import { AiUsageModule } from '../ai-usage/ai-usage.module';
import { ModelCredentialModule } from '../model-credential/model-credential.module';
import { AgentRuntimeClient } from './agent-runtime.client';
import { ModelGatewayController } from './model-gateway.controller';
import { ModelGatewayService } from './model-gateway.service';
import { ModelInvocationGrantService } from './model-invocation-grant.service';
import { UserModelRuntimeClient } from './user-model-runtime.client';

@Module({
  imports: [AiUsageModule, ModelCredentialModule],
  controllers: [ModelGatewayController],
  providers: [
    ModelGatewayService,
    ModelInvocationGrantService,
    UserModelRuntimeClient,
    AgentRuntimeClient,
  ],
  exports: [AgentRuntimeClient],
})
export class AgentRuntimeModule {}
