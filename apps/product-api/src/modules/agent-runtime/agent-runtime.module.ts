import { Module } from '@nestjs/common';
import { AgentRuntimeClient } from './agent-runtime.client';

@Module({ providers: [AgentRuntimeClient], exports: [AgentRuntimeClient] })
export class AgentRuntimeModule {}
