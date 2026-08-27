import type { ProductRequestContext } from '../../common/context/request-context';
import { LearningProgressService } from './learning-progress.service';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-0001',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'subject-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['learning_progress:read', 'learning_progress:write'],
  },
};

const progressRecord = {
  id: 'progress-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  completedSlugs: ['学习路线-01-agent基础与上下文工程'],
  lastOpenedSlug: '学习路线-02-tool-calling与mcp',
  verificationByCourse: {
    '学习路线-01-agent基础与上下文工程': {
      sessionId: 'practice-1',
      topic: 'ReAct',
      score: 80,
      answerCount: 3,
      recordedAt: '2026-08-27T00:00:00.000Z',
    },
  },
  createdAt: new Date('2026-08-27T00:00:00.000Z'),
  updatedAt: new Date('2026-08-27T00:00:00.000Z'),
};

function createService(stored: typeof progressRecord | null = progressRecord) {
  const transaction = {
    userLearningProgress: {
      upsert: jest.fn().mockResolvedValue(progressRecord),
    },
  };
  const prisma = {
    userLearningProgress: {
      findUnique: jest.fn().mockResolvedValue(stored),
    },
    $transaction: jest.fn((callback) => callback(transaction)),
  };
  const policy = { assert: jest.fn() };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new LearningProgressService(prisma as never, policy as never, audit as never);
  return { service, prisma, transaction, policy, audit };
}

describe('LearningProgressService reads', () => {
  it('没有服务端记录时返回 null，并只查询当前租户用户', async () => {
    const { service, prisma, policy } = createService(null);

    await expect(service.get(context)).resolves.toEqual({ progress: null });
    expect(prisma.userLearningProgress.findUnique).toHaveBeenCalledWith({
      where: { tenantId_userId: { tenantId: 'tenant-1', userId: 'user-1' } },
    });
    expect(policy.assert).toHaveBeenCalledWith(context.actor, 'learning_progress:read', {
      tenantId: 'tenant-1',
      ownerId: 'user-1',
    });
  });

  it('返回服务端进度时透传课程完成与验证记录', async () => {
    const { service } = createService();

    await expect(service.get(context)).resolves.toEqual({
      progress: {
        id: 'progress-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        completedSlugs: ['学习路线-01-agent基础与上下文工程'],
        lastOpenedSlug: '学习路线-02-tool-calling与mcp',
        verificationByCourse: progressRecord.verificationByCourse,
        updatedAt: '2026-08-27T00:00:00.000Z',
      },
    });
  });
});

describe('LearningProgressService writes', () => {
  it('按当前用户 upsert 进度并记录审计事件', async () => {
    const { service, transaction, policy, audit } = createService();
    const input = {
      completedSlugs: ['学习路线-01-agent基础与上下文工程'],
      lastOpenedSlug: '学习路线-02-tool-calling与mcp',
      verificationByCourse: progressRecord.verificationByCourse,
    };

    await expect(service.upsert(context, input)).resolves.toMatchObject({
      progress: { id: 'progress-1', completedSlugs: input.completedSlugs },
    });
    expect(transaction.userLearningProgress.upsert).toHaveBeenCalledWith({
      where: { tenantId_userId: { tenantId: 'tenant-1', userId: 'user-1' } },
      create: { tenantId: 'tenant-1', userId: 'user-1', ...input },
      update: input,
    });
    expect(policy.assert).toHaveBeenCalledWith(context.actor, 'learning_progress:write', {
      tenantId: 'tenant-1',
      ownerId: 'user-1',
    });
    expect(audit.record).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        action: 'learning_progress.upsert',
        resourceType: 'UserLearningProgress',
        resourceId: 'progress-1',
      }),
      transaction,
    );
  });
});
