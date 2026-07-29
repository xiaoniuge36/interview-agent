import { Injectable } from '@nestjs/common';
import { PolicyService } from '../../common/authz/policy.service';
import { AgentRuntimeClient } from '../agent-runtime/agent-runtime.client';
import { InterviewCommandRepository } from './interview-command.repository';

@Injectable()
export class InterviewCommandInfrastructure {
  constructor(
    readonly repository: InterviewCommandRepository,
    readonly policy: PolicyService,
    readonly agent: AgentRuntimeClient,
  ) {}
}
