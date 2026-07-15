import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AgentRuntimeModule } from '../agent-runtime/agent-runtime.module';
import { InterviewCommandCompletionHandler } from './interview-command-completion.handler';
import { InterviewCommandHandlers } from './interview-command.handlers';
import { InterviewCommandLeaseHandler } from './interview-command-lease.handler';
import { InterviewCommandRepository } from './interview-command.repository';
import { InterviewCommandService } from './interview-command.service';
import { InterviewCommandStartHandler } from './interview-command-start.handler';
import { InterviewController } from './interview.controller';
import { InterviewQueryService } from './interview-query.service';
import { InterviewService } from './interview.service';
import { InterviewEventBus } from './realtime/interview-event.bus';

const commandProviders = [
  InterviewCommandStartHandler,
  InterviewCommandLeaseHandler,
  InterviewCommandCompletionHandler,
  InterviewCommandHandlers,
  InterviewCommandRepository,
  InterviewCommandService,
  InterviewEventBus,
];

@Module({
  imports: [CommonModule, AgentRuntimeModule],
  controllers: [InterviewController],
  providers: [...commandProviders, InterviewQueryService, InterviewService],
})
export class InterviewModule {}
