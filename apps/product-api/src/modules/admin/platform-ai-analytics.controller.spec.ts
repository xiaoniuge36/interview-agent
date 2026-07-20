import type { ProductRequest } from '../../common/context/product-request';
import { PlatformAiAnalyticsController } from './platform-ai-analytics.controller';

const request = {
  context: {
    requestId: 'request-1',
    traceId: 'trace-1',
    tenantId: 'system',
    actor: {
      id: 'platform-admin',
      subject: 'platform-admin',
      tenantId: 'system',
      role: 'platform_admin',
      scopes: ['analytics:read'],
    },
  },
} as ProductRequest;

describe('PlatformAiAnalyticsController', () => {
  it('parses AI analytics filters before delegating to the platform service', async () => {
    const analytics = { analytics: jest.fn().mockResolvedValue({}) };
    const controller = new PlatformAiAnalyticsController(analytics as never);

    await controller.get(request, {
      period: '30d',
      provider: 'deepseek',
      operation: 'interview_next',
    });

    expect(analytics.analytics).toHaveBeenCalledWith(request.context, {
      period: '30d',
      provider: 'deepseek',
      operation: 'interview_next',
    });
  });
});
