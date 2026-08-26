import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  PageAgentConversationCore,
  type PageAgentConversationClient,
} from '../page-agent-core/page-agent-conversation.core';

type AdminConversationPrisma = {
  adminPageAgentConversation: PageAgentConversationClient['conversations'];
  adminPageAgentMessage: PageAgentConversationClient['messages'];
  $transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T>;
};

function adminConversationClient(source: unknown): PageAgentConversationClient {
  const client = source as AdminConversationPrisma;
  return {
    conversations: client.adminPageAgentConversation,
    messages: client.adminPageAgentMessage,
    transaction: (callback) => client.$transaction((tx) => callback(adminConversationClient(tx))),
  };
}

@Injectable()
export class AdminPageAgentConversationService extends PageAgentConversationCore {
  constructor(prisma: PrismaService) {
    super({
      client: adminConversationClient(prisma),
      notFound: {
        code: 'ADMIN_PAGE_AGENT_CONVERSATION_NOT_FOUND',
        message: '助手会话不存在或无权访问。',
      },
    });
  }
}
