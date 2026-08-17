import { UserPreferencesController } from './user-preferences.controller';

const context = {
  requestId: 'request-1',
  traceId: 'trace-0001',
  tenantId: 'tenant-1',
  actor: { id: 'user-1', role: 'user' },
};

describe('UserPreferencesController', () => {
  it('把当前登录上下文传给读取和写入服务', async () => {
    const service = {
      get: jest.fn().mockResolvedValue({ preferences: null }),
      upsert: jest.fn().mockResolvedValue({ preferences: { theme: 'glass', motion: false } }),
    };
    const controller = new UserPreferencesController(service as never);

    await controller.get({ context } as never);
    await controller.upsert({ context } as never, { theme: 'glass', motion: false });

    expect(service.get).toHaveBeenCalledWith(context);
    expect(service.upsert).toHaveBeenCalledWith(context, { theme: 'glass', motion: false });
  });

  it('在控制器边界拒绝未知主题和客户端身份字段', () => {
    const controller = new UserPreferencesController({ upsert: jest.fn() } as never);

    expect(() =>
      controller.upsert({ context } as never, {
        theme: 'unknown',
        motion: true,
        userId: 'other-user',
      }),
    ).toThrow();
  });
});
