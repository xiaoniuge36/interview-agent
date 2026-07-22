import type { ProductRequest } from '../../common/context/product-request';
import { AdminController } from './admin.controller';

const request = {
  context: {
    requestId: 'request-1',
    traceId: 'trace-1',
    tenantId: 'tenant-1',
    actor: {
      id: 'admin-1',
      subject: 'admin-1',
      tenantId: 'tenant-1',
      role: 'admin',
      scopes: ['question:read', 'candidate:review', 'model:manage', 'audit:read'],
    },
  },
} as ProductRequest;

describe('AdminController platform routes', () => {
  it('parses platform dashboard periods before delegating to the global service', async () => {
    const services = servicesFor();
    const controller = new AdminController(services as never);

    await controller.platformDashboard(request, { period: '30d' });

    expect(services.platformDashboard.dashboard).toHaveBeenCalledWith(request.context, {
      period: '30d',
    });
  });

  it('parses account filters before delegating to the platform governance service', async () => {
    const services = servicesFor();
    const controller = new AdminController(services as never);

    await controller.queryAccounts(request, { keyword: '  Avery ', status: 'disabled', page: '2' });

    expect(services.accounts.query).toHaveBeenCalledWith(request.context, {
      keyword: 'Avery',
      status: 'disabled',
      page: 2,
      pageSize: 20,
    });
  });
});

describe('AdminController list routes', () => {
  it('parses the question query parameters before delegating to the query service', async () => {
    const services = servicesFor();
    const controller = new AdminController(services as never);

    await controller.queryQuestions(request, {
      keyword: '  dependency injection  ',
      status: 'published',
      difficulty: 'hard',
      page: '2',
      pageSize: '10',
    });

    expect(services.query.queryQuestions).toHaveBeenCalledWith(request.context, {
      keyword: 'dependency injection',
      status: 'published',
      difficulty: 'hard',
      page: 2,
      pageSize: 10,
    });
  });

  it('returns a CSV export with safe download headers', async () => {
    const services = servicesFor();
    services.query.exportQuestions.mockResolvedValue([]);
    const response = exportResponse();
    const controller = new AdminController(services as never);

    const body = await controller.exportQuestions(request, { status: 'draft' }, response as never);

    expect(services.query.exportQuestions).toHaveBeenCalledWith(request.context, {
      page: 1,
      pageSize: 20,
      status: 'draft',
    });
    expect(response.type).toHaveBeenCalledWith('text/csv; charset=utf-8');
    expect(response.attachment).toHaveBeenCalledWith('questions.csv');
    expect(body).toBe('\uFEFF题目 ID,题目,题型,难度,可见范围,状态');
  });
});

function servicesFor() {
  return {
    admin: {},
    accounts: { query: jest.fn().mockResolvedValue({}) },
    platformDashboard: { dashboard: jest.fn().mockResolvedValue({}) },
    query: {
      queryQuestions: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
      exportQuestions: jest.fn(),
    },
  };
}

function exportResponse() {
  return { attachment: jest.fn(), type: jest.fn() };
}
