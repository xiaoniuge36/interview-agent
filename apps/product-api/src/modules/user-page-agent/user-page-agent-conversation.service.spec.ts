import { NotFoundException } from '@nestjs/common';
import { UserPageAgentConversationService } from './user-page-agent-conversation.service';

const context = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: { id: 'user-1' },
} as never;

describe('UserPageAgentConversationService', () => {
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

  it('updates the default title from the first user message', async () => {
    const prisma = createPrisma();
    prisma.userAgentConversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      title: '新对话',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    });
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

  it('masks credential-shaped values before persisting a message', async () => {
    const prisma = createPrisma();
    prisma.userAgentConversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      title: '已有对话',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    });
    const service = new UserPageAgentConversationService(prisma as never);

    await service.appendMessages(context, 'conversation-1', [
      { role: 'user', content: 'apiKey=sk-secret-value-123456' },
    ]);

    expect(prisma.userAgentMessage.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ content: 'apiKey=[已隐藏]' })],
    });
  });

  it('rejects a conversation that belongs to another user', async () => {
    const prisma = createPrisma();
    prisma.userAgentConversation.findFirst.mockResolvedValue(null);
    const service = new UserPageAgentConversationService(prisma as never);

    await expect(service.get(context, 'conversation-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

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
