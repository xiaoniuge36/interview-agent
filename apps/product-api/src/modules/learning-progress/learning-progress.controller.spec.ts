import { LearningProgressController } from './learning-progress.controller';

const context = {
  requestId: 'request-1',
  traceId: 'trace-0001',
  tenantId: 'tenant-1',
  actor: { id: 'user-1', role: 'user' },
};

const input = {
  completedSlugs: ['学习路线-01-agent基础与上下文工程'],
  lastOpenedSlug: null,
  verificationByCourse: {},
};

describe('LearningProgressController', () => {
  it('把当前登录上下文传给读取和写入服务', async () => {
    const service = {
      get: jest.fn().mockResolvedValue({ progress: null }),
      upsert: jest.fn().mockResolvedValue({ progress: null }),
    };
    const controller = new LearningProgressController(service as never);

    await controller.get({ context } as never);
    await controller.upsert({ context } as never, input);

    expect(service.get).toHaveBeenCalledWith(context);
    expect(service.upsert).toHaveBeenCalledWith(context, input);
  });

  it('在控制器边界拒绝身份字段与保留课程键', () => {
    const controller = new LearningProgressController({ upsert: jest.fn() } as never);
    const polluted = JSON.parse(
      '{"completedSlugs":[],"lastOpenedSlug":null,"verificationByCourse":{"__proto__":' +
        '{"sessionId":"s","topic":"t","score":null,"answerCount":0,"recordedAt":"2026-08-27T00:00:00.000Z"}}}',
    ) as unknown;

    expect(() =>
      controller.upsert({ context } as never, { ...input, userId: 'other-user' }),
    ).toThrow();
    expect(() => controller.upsert({ context } as never, polluted)).toThrow();
  });
});
