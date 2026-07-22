import type { ProductRequest } from '../../common/context/product-request';
import { CandidateReviewAdminController } from './candidate-review-admin.controller';

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
      scopes: ['candidate:review', 'question:write'],
    },
  },
} as ProductRequest;

describe('CandidateReviewAdminController', () => {
  it('parses the batch publish command before delegating to the candidate service', async () => {
    const candidates = { batchPublish: jest.fn().mockResolvedValue({}) };
    const controller = new CandidateReviewAdminController(
      candidates as never,
      {} as never,
      {} as never,
    );

    await controller.batchPublishCandidates(request, { candidateIds: ['candidate-1'] });

    expect(candidates.batchPublish).toHaveBeenCalledWith(request.context, {
      candidateIds: ['candidate-1'],
      visibility: 'tenant',
    });
  });
});
