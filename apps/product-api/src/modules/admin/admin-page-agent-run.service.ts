import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { PageAgentRunCore, type PageAgentRunClient } from '../page-agent-core/page-agent-run.core';

type AdminRunPrisma = {
  adminPageAgentConversation: PageAgentRunClient['conversations'];
  adminPageAgentRun: PageAgentRunClient['runs'];
};

function adminRunClient(source: unknown): PageAgentRunClient {
  const client = source as AdminRunPrisma;
  return {
    conversations: client.adminPageAgentConversation,
    runs: client.adminPageAgentRun,
  };
}

@Injectable()
export class AdminPageAgentRunService extends PageAgentRunCore {
  constructor(prisma: PrismaService) {
    super({
      client: adminRunClient(prisma),
      errors: {
        notFoundMessage: '助手运行记录不存在或无权访问。',
        conversationNotFoundCode: 'ADMIN_PAGE_AGENT_CONVERSATION_NOT_FOUND',
        runNotFoundCode: 'ADMIN_PAGE_AGENT_RUN_NOT_FOUND',
        retryTargetNotFoundCode: 'ADMIN_PAGE_AGENT_RETRY_TARGET_NOT_FOUND',
        conflict: {
          code: 'ADMIN_PAGE_AGENT_RUN_STATE_CONFLICT',
          message: '助手运行状态已变化，请刷新后重试。',
        },
      },
    });
  }
}
