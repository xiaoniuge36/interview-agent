import type { ProductRequest } from '../../common/context/product-request';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

const request = {
  context: {
    requestId: 'request-1',
    traceId: 'trace-1',
    tenantId: 'tenant-1',
    actor: {
      id: 'reviewer-1',
      subject: 'reviewer-1',
      tenantId: 'tenant-1',
      role: 'question_reviewer',
      scopes: ['content:import'],
    },
  },
} as ProductRequest;

describe('ImportController list routes', () => {
  it('delegates review source context requests to the import service', async () => {
    const service = importService();
    const controller = new ImportController(service as unknown as ImportService);

    await reviewController(controller).reviewContext(request, 'import-1');

    expect(service.reviewContext).toHaveBeenCalledWith(request.context, 'import-1');
  });

  it('parses import filters before requesting a server page', async () => {
    const service = importService();
    const controller = new ImportController(service as unknown as ImportService);

    await controller.query(request, {
      keyword: '  architecture  ',
      status: 'review',
      page: '2',
      pageSize: '10',
    });

    expect(service.query).toHaveBeenCalledWith(request.context, {
      keyword: 'architecture',
      status: 'review',
      page: 2,
      pageSize: 10,
    });
  });

  it('returns import exports as a CSV attachment', async () => {
    const service = importService();
    const response = exportResponse();
    const controller = new ImportController(service as unknown as ImportService);

    const body = await controller.export(request, { status: 'failed' }, response as never);

    expect(service.listForExport).toHaveBeenCalledWith(request.context, {
      status: 'failed',
      page: 1,
      pageSize: 20,
    });
    expect(response.attachment).toHaveBeenCalledWith('imports.csv');
    expect(response.type).toHaveBeenCalledWith('text/csv; charset=utf-8');
    expect(body).toBe('\uFEFF任务 ID,任务名称,状态,候选题数,创建时间,更新时间,失败原因');
  });
});

function importService() {
  return {
    query: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
    listForExport: jest.fn().mockResolvedValue([]),
    reviewContext: jest.fn().mockResolvedValue({ task: {}, sourceChunks: [] }),
  };
}

function reviewController(controller: ImportController) {
  return controller as unknown as {
    reviewContext(request: ProductRequest, taskId: string): Promise<unknown>;
  };
}

function exportResponse() {
  return { attachment: jest.fn(), type: jest.fn() };
}
