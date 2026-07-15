import { Module } from '@nestjs/common';
import { ModelCredentialModule } from '../model-credential/model-credential.module';
import { AgentRuntimeClient } from './agent-runtime.client';
import { UserModelRuntimeClient } from './user-model-runtime.client';

@Module({
  imports: [ModelCredentialModule],
  providers: [UserModelRuntimeClient, AgentRuntimeClient],
  exports: [AgentRuntimeClient],
})
export class AgentRuntimeModule {}
