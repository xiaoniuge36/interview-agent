import { NotFoundException } from '@nestjs/common';
import { AdminPageAgentConversationService } from './admin-page-agent-conversation.service';

const context = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: { id: 'admin-1' },
} as never;

describe('AdminPageAgentConversationService.list', () => {
  it('lists only conversations owned by the current tenant and actor', async () => {
    const prisma = createPrisma();
    prisma.adminPageAgentConversation.findMany.mockResolvedValue([]);
    const service = new AdminPageAgentConversationService(prisma as never);

    await service.list(context);

    expect(prisma.adminPageAgentConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', userId: 'admin-1' },
        orderBy: { updatedAt: 'desc' },
      }),
    );
  });
});

describe('AdminPageAgentConversationService.create', () => {
  it('creates a default titled conversation', async () => {
    const prisma = createPrisma();
    prisma.adminPageAgentConversation.create.mockResolvedValue({
      id: 'conversation-1',
      title: '新对话',
      createdAt: new Date('2026-07-20T00:00:00.000Z'),
      updatedAt: new Date('2026-07-20T00:00:00.000Z'),
      _count: { messages: 0 },
    });
    const service = new AdminPageAgentConversationService(prisma as never);

    await service.create(context);

    expect(prisma.adminPageAgentConversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { tenantId: 'tenant-1', userId: 'admin-1', title: '新对话' },
      }),
    );
  });
});

describe('AdminPageAgentConversationService.get', () => {
  it('rejects a conversation that belongs to another actor', async () => {
    const prisma = createPrisma();
    prisma.adminPageAgentConversation.findFirst.mockResolvedValue(null);
    const service = new AdminPageAgentConversationService(prisma as never);

    await expect(service.get(context, 'conversation-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.adminPageAgentConversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conversation-1', tenantId: 'tenant-1', userId: 'admin-1' },
      }),
    );
  });
});

describe('AdminPageAgentConversationService.appendMessages', () => {
  it('updates the default title from the first user message', async () => {
    const prisma = createPrisma();
    prisma.adminPageAgentConversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      title: '新对话',
      createdAt: new Date('2026-07-20T00:00:00.000Z'),
      updatedAt: new Date('2026-07-20T00:00:00.000Z'),
      messages: [],
    });
    prisma.adminPageAgentConversation.update.mockResolvedValue({
      id: 'conversation-1',
      title: '查询待审核导入',
    });
    prisma.adminPageAgentMessage.createMany.mockResolvedValue({ count: 1 });
    const service = new AdminPageAgentConversationService(prisma as never);

    await service.appendMessages(context, 'conversation-1', [
      { role: 'user', content: '查询待审核导入批次' },
    ]);

    expect(prisma.adminPageAgentConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conversation-1' },
        data: expect.objectContaining({ title: '查询待审核导入批次' }),
      }),
    );
  });

  it('masks credential-shaped values before persisting a message', async () => {
    const prisma = createPrisma();
    prisma.adminPageAgentConversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      title: '已有对话',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    });
    const service = new AdminPageAgentConversationService(prisma as never);

    await service.appendMessages(context, 'conversation-1', [
      { role: 'user', content: 'apiKey=sk-secret-value-123456' },
    ]);

    expect(prisma.adminPageAgentMessage.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ content: 'apiKey=[已隐藏]' })],
    });
  });
});

function createPrisma() {
  const prisma = {
    adminPageAgentConversation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    adminPageAgentMessage: { createMany: jest.fn() },
  };
  return {
    ...prisma,
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
  };
}
