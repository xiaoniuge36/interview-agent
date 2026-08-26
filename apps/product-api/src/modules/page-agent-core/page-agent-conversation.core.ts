import { NotFoundException } from '@nestjs/common';
import type { ProductRequestContext } from '../../common/context/request-context';
import { maskPageAgentText } from './page-agent-sanitization';
import type { PageAgentMessageInput } from './page-agent.schemas';

const DEFAULT_TITLE = '新对话';
const MAX_CONVERSATIONS = 100;
const TITLE_PREVIEW_LENGTH = 24;
const MESSAGE_PREVIEW_LENGTH = 120;
// 会话详情只加载最新 N 条消息，防止长对话一次性全量返回。
export const PAGE_AGENT_MESSAGE_HISTORY_LIMIT = 200;

export type PageAgentMessageRecord = {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  tokenCount: number | null;
  createdAt: Date;
};

export type PageAgentConversationRecord = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: PageAgentMessageRecord[];
  _count?: { messages: number };
};

export type PageAgentConversationClient = {
  conversations: {
    findMany(args: unknown): Promise<PageAgentConversationRecord[]>;
    findFirst(args: unknown): Promise<PageAgentConversationRecord | null>;
    create(args: unknown): Promise<PageAgentConversationRecord>;
    update(args: unknown): Promise<PageAgentConversationRecord>;
    delete(args: unknown): Promise<unknown>;
  };
  messages: { createMany(args: unknown): Promise<{ count: number }> };
  transaction<T>(callback: (tx: PageAgentConversationClient) => Promise<T>): Promise<T>;
};

export type PageAgentConversationBinding = {
  client: PageAgentConversationClient;
  notFound: { code: string; message: string };
};

export class PageAgentConversationCore {
  // 会话数据与当前账号绑定，避免跨租户或跨账号串线。
  constructor(private readonly binding: PageAgentConversationBinding) {}

  async list(context: ProductRequestContext) {
    const records = await this.binding.client.conversations.findMany({
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
    const record = await this.binding.client.conversations.create({
      data: { ...this.scope(context), title: normalizeTitle(title) },
      include: {
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return toSummary(record);
  }

  async get(context: ProductRequestContext, conversationId: string) {
    // 截断语义：仅加载最新 PAGE_AGENT_MESSAGE_HISTORY_LIMIT 条消息，仍按 createdAt 升序返回；
    // 响应结构保持不变（不新增截断标志字段），messageCount 依旧表示会话内消息总数。
    const conversation = await this.binding.client.conversations.findFirst({
      where: { ...this.scope(context), id: conversationId },
      include: {
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: PAGE_AGENT_MESSAGE_HISTORY_LIMIT },
      },
    });
    if (!conversation) throw this.notFound();
    return toConversation(conversation);
  }

  async rename(context: ProductRequestContext, conversationId: string, title: string) {
    await this.findOwned(context, conversationId);
    const record = await this.binding.client.conversations.update({
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
    await this.binding.client.conversations.delete({ where: { id: conversationId } });
    return null;
  }

  async appendMessages(
    context: ProductRequestContext,
    conversationId: string,
    messages: PageAgentMessageInput[],
  ) {
    const client = this.binding.client;
    const conversation = await this.findOwned(context, conversationId, client);
    await client.transaction(async (transaction) => {
      await transaction.messages.createMany({
        data: messages.map((message) => ({
          ...message,
          content: maskPageAgentText(message.content),
          tenantId: context.tenantId,
          conversationId,
        })),
      });
      const firstUserMessage = messages.find((message) => message.role === 'user');
      const data: { updatedAt: Date; title?: string } = { updatedAt: new Date() };
      if (
        conversation.title === DEFAULT_TITLE &&
        !conversation.messages?.length &&
        firstUserMessage
      ) {
        data.title = titleFromMessage(firstUserMessage.content);
      }
      await transaction.conversations.update({ where: { id: conversationId }, data });
    });
    return this.get(context, conversationId);
  }

  private async findOwned(
    context: ProductRequestContext,
    conversationId: string,
    client = this.binding.client,
  ) {
    const conversation = await client.conversations.findFirst({
      where: { ...this.scope(context), id: conversationId },
      include: { messages: { select: { role: true }, take: 1 } },
    });
    if (!conversation) throw this.notFound();
    return conversation;
  }

  private scope(context: ProductRequestContext) {
    return { tenantId: context.tenantId, userId: context.actor.id };
  }

  private notFound() {
    return new NotFoundException({
      code: this.binding.notFound.code,
      message: this.binding.notFound.message,
    });
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

function toSummary(record: PageAgentConversationRecord) {
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

function toConversation(record: PageAgentConversationRecord) {
  // 数据库按 createdAt 降序取最新一批消息，这里翻转回升序，保持既有的返回顺序。
  const messages = [...(record.messages ?? [])].reverse();
  return {
    ...toSummary({ ...record, messages }),
    messages: messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}
