import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { PageAgentRunCore, type PageAgentRunClient } from '../page-agent-core/page-agent-run.core';

type UserRunPrisma = {
  userAgentConversation: PageAgentRunClient['conversations'];
  userPageAgentRun: PageAgentRunClient['runs'];
};

function userRunClient(source: unknown): PageAgentRunClient {
  const client = source as UserRunPrisma;
  return {
    conversations: client.userAgentConversation,
    runs: client.userPageAgentRun,
  };
}

@Injectable()
export class UserPageAgentRunService extends PageAgentRunCore {
  constructor(prisma: PrismaService) {
    super({
      client: userRunClient(prisma),
      errors: {
        notFoundMessage: '训练运行记录不存在或无权访问。',
        conversationNotFoundCode: 'USER_PAGE_AGENT_CONVERSATION_NOT_FOUND',
        runNotFoundCode: 'USER_PAGE_AGENT_RUN_NOT_FOUND',
        retryTargetNotFoundCode: 'USER_PAGE_AGENT_RETRY_TARGET_NOT_FOUND',
        conflict: {
          code: 'USER_PAGE_AGENT_RUN_STATE_CONFLICT',
          message: '训练运行状态已变化，请刷新后重试。',
        },
      },
    });
  }
}
