import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  PageAgentConversationCore,
  type PageAgentConversationClient,
} from '../page-agent-core/page-agent-conversation.core';

type UserConversationPrisma = {
  userAgentConversation: PageAgentConversationClient['conversations'];
  userAgentMessage: PageAgentConversationClient['messages'];
  $transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T>;
};

function userConversationClient(source: unknown): PageAgentConversationClient {
  const client = source as UserConversationPrisma;
  return {
    conversations: client.userAgentConversation,
    messages: client.userAgentMessage,
    transaction: (callback) => client.$transaction((tx) => callback(userConversationClient(tx))),
  };
}

@Injectable()
export class UserPageAgentConversationService extends PageAgentConversationCore {
  constructor(prisma: PrismaService) {
    super({
      client: userConversationClient(prisma),
      notFound: {
        code: 'USER_AGENT_CONVERSATION_NOT_FOUND',
        message: '刷题教练会话不存在或无权访问。',
      },
    });
  }
}
