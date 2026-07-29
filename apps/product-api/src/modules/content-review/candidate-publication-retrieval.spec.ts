import { CandidatePublicationService } from './candidate-publication.service';
import { CandidateReviewInfrastructure } from './candidate-review-infrastructure';
import type { ProductRequestContext } from '../../common/context/request-context';

const context: ProductRequestContext = {
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
};

test('queues an embedding job after a candidate becomes a published question', async () => {
  const transaction = {
    candidateQuestion: {
      findFirst: jest.fn().mockResolvedValue(candidate()),
      update: jest.fn().mockResolvedValue({}),
    },
    question: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(question()),
    },
  };
  const database = {
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };
  const jobs = { enqueueEmbedding: jest.fn().mockResolvedValue({ id: 'job-1' }) };
  const service = new CandidatePublicationService(
    new CandidateReviewInfrastructure(
      database as never,
      { assert: jest.fn() } as never,
      { record: jest.fn().mockResolvedValue({}) } as never,
    ),
    jobs as never,
  );

  await service.publish(context, 'candidate-1', { visibility: 'tenant' });

  expect(jobs.enqueueEmbedding).toHaveBeenCalledWith(
    expect.objectContaining({
      entityType: 'question',
      entityId: 'question-1',
      tenantId: 'tenant-1',
    }),
  );
});

function candidate() {
  return {
    id: 'candidate-1',
    tenantId: 'tenant-1',
    status: 'approved',
    publishedQuestionId: null,
    title: 'Published question',
    stem: 'Explain isolation.',
    type: 'short_answer',
    difficulty: 'easy',
    tags: ['database'],
    answer: 'Use serializable transactions.',
    rubric: [],
    sourceRefs: [],
  };
}

function question() {
  return {
    id: 'question-1',
    tenantId: 'tenant-1',
    visibility: 'tenant',
    title: 'Published question',
    stem: 'Explain isolation.',
    type: 'short_answer',
    difficulty: 'easy',
    tags: ['database'],
    answer: 'Use serializable transactions.',
    rubric: [],
    sourceRefs: [],
    status: 'published',
  };
}
