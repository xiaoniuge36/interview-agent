import type { ProductRequest } from '../../common/context/product-request';
import { AdminController } from './admin.controller';
import { AdminQueryService } from './admin-query.service';
import { AdminService } from './admin.service';
import { CandidateReviewService } from '../content-review/candidate-review.service';

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

describe('AdminController list routes', () => {
  it('parses the question query parameters before delegating to the query service', async () => {
    const query = queryService();
    const controller = controllerWith(query);

    await controller.queryQuestions(request, {
      keyword: '  dependency injection  ',
      status: 'published',
      difficulty: 'hard',
      page: '2',
      pageSize: '10',
    });

    expect(query.queryQuestions).toHaveBeenCalledWith(request.context, {
      keyword: 'dependency injection',
      status: 'published',
      difficulty: 'hard',
      page: 2,
      pageSize: 10,
    });
  });

  it('returns a CSV export with safe download headers', async () => {
    const query = queryService();
    query.exportQuestions.mockResolvedValue([]);
    const response = exportResponse();
    const controller = controllerWith(query);

    const body = await controller.exportQuestions(request, { status: 'draft' }, response as never);

    expect(query.exportQuestions).toHaveBeenCalledWith(request.context, {
      page: 1,
      pageSize: 20,
      status: 'draft',
    });
    expect(response.type).toHaveBeenCalledWith('text/csv; charset=utf-8');
    expect(response.attachment).toHaveBeenCalledWith('questions.csv');
    expect(body).toBe('\uFEFF题目 ID,题目,题型,难度,可见范围,状态');
  });
});

function controllerWith(query: ReturnType<typeof queryService>) {
  return new AdminController(
    {} as AdminService,
    {} as CandidateReviewService,
    query as unknown as AdminQueryService,
  );
}

function queryService() {
  return {
    queryQuestions: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
    exportQuestions: jest.fn(),
  };
}

function exportResponse() {
  return {
    attachment: jest.fn(),
    type: jest.fn(),
  };
}
