import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AiUsageModule } from '../ai-usage/ai-usage.module';
import { ModelCredentialModule } from '../model-credential/model-credential.module';
import { UserPageAgentController } from './user-page-agent.controller';
import { UserPageAgentConversationService } from './user-page-agent-conversation.service';
import { UserPageAgentService } from './user-page-agent.service';

@Module({
  imports: [CommonModule, AiUsageModule, ModelCredentialModule],
  controllers: [UserPageAgentController],
  providers: [UserPageAgentService, UserPageAgentConversationService],
})
export class UserPageAgentModule {}
