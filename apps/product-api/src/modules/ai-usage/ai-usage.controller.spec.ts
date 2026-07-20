import type { ProductRequest } from '../../common/context/product-request';
import { AiUsageController } from './ai-usage.controller';

const request = {
  context: {
    requestId: 'request-1',
    traceId: 'trace-1',
    tenantId: 'tenant-1',
    actor: {
      id: 'user-1',
      subject: 'user-1',
      tenantId: 'tenant-1',
      role: 'user',
      scopes: ['model_credential:read'],
    },
  },
} as ProductRequest;

describe('AiUsageController', () => {
  it('parses the requested period before reading the caller summary', async () => {
    const usage = { summary: jest.fn().mockResolvedValue({}) };
    const controller = new AiUsageController(usage as never);

    await controller.summary(request, { period: '30d' });

    expect(usage.summary).toHaveBeenCalledWith(request.context, { period: '30d' });
  });
});
