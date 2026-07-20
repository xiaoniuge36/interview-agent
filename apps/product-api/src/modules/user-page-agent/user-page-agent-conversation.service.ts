import { Injectable, NotFoundException } from '@nestjs/common';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';
import type { UserAgentMessageInput } from './user-page-agent.schemas';

const DEFAULT_TITLE = '新对话';
const MAX_CONVERSATIONS = 100;
const TITLE_PREVIEW_LENGTH = 24;
const MESSAGE_PREVIEW_LENGTH = 120;

type MessageRecord = {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  tokenCount: number | null;
  createdAt: Date;
};
type ConversationRecord = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: MessageRecord[];
  _count?: { messages: number };
};
type ConversationClient = {
  userAgentConversation: {
    findMany(args: unknown): Promise<ConversationRecord[]>;
    findFirst(args: unknown): Promise<ConversationRecord | null>;
    create(args: unknown): Promise<ConversationRecord>;
    update(args: unknown): Promise<ConversationRecord>;
    delete(args: unknown): Promise<unknown>;
  };
  userAgentMessage: { createMany(args: unknown): Promise<{ count: number }> };
  $transaction<T>(callback: (client: ConversationClient) => Promise<T>): Promise<T>;
};

@Injectable()
export class UserPageAgentConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(context: ProductRequestContext) {
    const records = await this.client().userAgentConversation.findMany({
      where: this.scope(context),
      orderBy: { updatedAt: 'desc' },
      take: MAX_CONVERSATIONS,
      include: {
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return records.map(toSummary);
  }

  async create(context: ProductRequestContext, title?: string) {
    const record = await this.client().userAgentConversation.create({
      data: { ...this.scope(context), title: normalizeTitle(title) },
      include: {
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return toSummary(record);
  }

  async get(context: ProductRequestContext, conversationId: string) {
    const conversation = await this.client().userAgentConversation.findFirst({
      where: { ...this.scope(context), id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw notFound();
    return toConversation(conversation);
  }

  async rename(context: ProductRequestContext, conversationId: string, title: string) {
    await this.findOwned(context, conversationId);
    const record = await this.client().userAgentConversation.update({
      where: { id: conversationId },
      data: { title: normalizeTitle(title) },
      include: {
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return toSummary(record);
  }

  async remove(context: ProductRequestContext, conversationId: string): Promise<null> {
    await this.findOwned(context, conversationId);
    await this.client().userAgentConversation.delete({ where: { id: conversationId } });
    return null;
  }

  async appendMessages(
    context: ProductRequestContext,
    conversationId: string,
    messages: UserAgentMessageInput[],
  ) {
    const client = this.client();
    const conversation = await this.findOwned(context, conversationId, client);
    await client.$transaction(async (transaction) => {
      await transaction.userAgentMessage.createMany({
        data: messages.map((message) => ({
          ...message,
          content: maskSensitiveText(message.content),
          tenantId: context.tenantId,
          conversationId,
        })),
      });
      const firstUserMessage = messages.find((message) => message.role === 'user');
      const data: { updatedAt: Date; title?: string } = { updatedAt: new Date() };
      if (conversation.title === DEFAULT_TITLE && !conversation.messages?.length && firstUserMessage) {
        data.title = titleFromMessage(firstUserMessage.content);
      }
      await transaction.userAgentConversation.update({ where: { id: conversationId }, data });
    });
    return this.get(context, conversationId);
  }

  private async findOwned(
    context: ProductRequestContext,
    conversationId: string,
    client = this.client(),
  ) {
    const conversation = await client.userAgentConversation.findFirst({
      where: { ...this.scope(context), id: conversationId },
      include: { messages: { select: { role: true }, take: 1 } },
    });
    if (!conversation) throw notFound();
    return conversation;
  }

  private scope(context: ProductRequestContext) {
    return { tenantId: context.tenantId, userId: context.actor.id };
  }

  private client() {
    return this.prisma as unknown as ConversationClient;
  }
}

function normalizeTitle(title?: string) {
  return title?.trim() || DEFAULT_TITLE;
}

function titleFromMessage(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  return normalized.length <= TITLE_PREVIEW_LENGTH
    ? normalized
    : `${normalized.slice(0, TITLE_PREVIEW_LENGTH - 1)}…`;
}

function toSummary(record: ConversationRecord) {
  const lastMessage = record.messages?.[0];
  return {
    id: record.id,
    title: record.title,
    messageCount: record._count?.messages ?? record.messages?.length ?? 0,
    lastMessagePreview: lastMessage?.content.slice(0, MESSAGE_PREVIEW_LENGTH) ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toConversation(record: ConversationRecord) {
  return {
    ...toSummary(record),
    messages: (record.messages ?? []).map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

function maskSensitiveText(value: string) {
  return value
    .replace(/(api[_ -]?key|secret|password|token)\s*[:=]\s*[^\s,;]+/gi, '$1=[已隐藏]')
    .replace(/\b(?:sk|rk)-[A-Za-z0-9_-]{8,}\b/g, '[已隐藏]')
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [已隐藏]');
}

function notFound() {
  return new NotFoundException({
    code: 'USER_AGENT_CONVERSATION_NOT_FOUND',
    message: '刷题教练会话不存在或无权访问。',
  });
}
