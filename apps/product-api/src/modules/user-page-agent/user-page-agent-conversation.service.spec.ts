import { NotFoundException } from '@nestjs/common';
import { UserPageAgentConversationService } from './user-page-agent-conversation.service';

const context = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: { id: 'user-1' },
} as never;

describe('UserPageAgentConversationService ownership', () => {
  it('lists only conversations owned by the current tenant and user', async () => {
    const prisma = createPrisma();
    prisma.userAgentConversation.findMany.mockResolvedValue([]);
    const service = new UserPageAgentConversationService(prisma as never);

    await service.list(context);

    expect(prisma.userAgentConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', userId: 'user-1' },
        orderBy: { updatedAt: 'desc' },
      }),
    );
  });

  it('rejects a conversation that belongs to another user', async () => {
    const prisma = createPrisma();
    prisma.userAgentConversation.findFirst.mockResolvedValue(null);
    const service = new UserPageAgentConversationService(prisma as never);

    await expect(service.get(context, 'conversation-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UserPageAgentConversationService message window', () => {
  it('loads only the latest bounded messages and returns them ascending', async () => {
    const prisma = createPrisma();
    prisma.userAgentConversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      title: '长对话',
      createdAt: new Date('2026-07-27T00:00:00.000Z'),
      updatedAt: new Date('2026-07-27T00:05:00.000Z'),
      _count: { messages: 500 },
      messages: [
        {
          id: 'message-new',
          role: 'assistant',
          content: '最新回复',
          tokenCount: null,
          createdAt: new Date('2026-07-27T00:05:00.000Z'),
        },
        {
          id: 'message-old',
          role: 'user',
          content: '较早提问',
          tokenCount: null,
          createdAt: new Date('2026-07-27T00:04:00.000Z'),
        },
      ],
    });
    const service = new UserPageAgentConversationService(prisma as never);

    const result = await service.get(context, 'conversation-1');

    expect(prisma.userAgentConversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          messages: { orderBy: { createdAt: 'desc' }, take: 200 },
        }),
      }),
    );
    expect(result.messageCount).toBe(500);
    expect(result.messages.map((message) => message.id)).toEqual(['message-old', 'message-new']);
  });
});

describe('UserPageAgentConversationService automatic titles', () => {
  it('updates the default title from the first user message', async () => {
    const prisma = createPrisma();
    prisma.userAgentConversation.findFirst.mockResolvedValue(conversation('新对话'));
    const service = new UserPageAgentConversationService(prisma as never);

    await service.appendMessages(context, 'conversation-1', [
      { role: 'user', content: '帮我安排今天的薄弱项训练' },
    ]);

    expect(prisma.userAgentConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: '帮我安排今天的薄弱项训练' }),
      }),
    );
  });
});

describe('UserPageAgentConversationService message privacy', () => {
  it('masks credential-shaped values before persisting a message', async () => {
    const prisma = createPrisma();
    prisma.userAgentConversation.findFirst.mockResolvedValue(conversation('已有对话'));
    const service = new UserPageAgentConversationService(prisma as never);

    await service.appendMessages(context, 'conversation-1', [
      { role: 'user', content: 'apiKey=sk-secret-value-123456' },
    ]);

    expect(prisma.userAgentMessage.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ content: 'apiKey=[已隐藏]' })],
    });
  });
});

function conversation(title: string) {
  return {
    id: 'conversation-1',
    title,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };
}

function createPrisma() {
  const prisma = {
    userAgentConversation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userAgentMessage: { createMany: jest.fn() },
  };
  return {
    ...prisma,
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
  };
}
