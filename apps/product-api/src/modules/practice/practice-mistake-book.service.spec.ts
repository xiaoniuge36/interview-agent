import type { ProductRequestContext } from '../../common/context/request-context';
import { PracticeMistakeBookService } from './practice-mistake-book.service';

describe('PracticeMistakeBookService list', () => {
  it('returns low-score snapshots, evidence, review state, and bounded pagination', async () => {
    const { service, prisma } = createService({ reviews: [reviewRecord()] });

    await expect(
      service.list(context(), { page: 1, pageSize: 20, sort: 'recent' }),
    ).resolves.toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
      items: [
        {
          id: 'evaluation-1',
          score: 42,
          canStartReview: false,
          reviewedAt: '2026-07-29T09:00:00.000Z',
          questionSnapshot: { id: 'question-1', title: 'Agent orchestration' },
          evidence: [{ tag: 'orchestration', observedScore: 42 }],
        },
      ],
    });
    expect(prisma.evaluationResult.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          score: { lt: 60 },
          sessionItem: { session: { userId: 'user-1' } },
        }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 20,
      }),
    );
  });

  it('uses the requesting tenant and user as the only history scope', async () => {
    const { service, prisma } = createService({ records: [] });

    await expect(
      service.list(context('tenant-2', 'user-2'), { page: 2, pageSize: 10, sort: 'recent' }),
    ).resolves.toMatchObject({ items: [], page: 2 });

    expect(prisma.evaluationResult.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: 'tenant-2',
        sessionItem: { session: { userId: 'user-2' } },
      }),
    });
  });
});

describe('PracticeMistakeBookService priority sort', () => {
  it('orders by lowest score first when the priority sort is requested', async () => {
    const { service, prisma } = createService();

    await service.list(context(), { page: 1, pageSize: 20, sort: 'priority' });

    expect(prisma.evaluationResult.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ score: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });
});

describe('PracticeMistakeBookService review creation', () => {
  it('creates a weakness review from a currently published mistake question', async () => {
    const record = evaluationRecord({ status: 'published' });
    const { service, commands } = createService({ record });

    await service.startReview(context(), 'evaluation-1');

    expect(commands.create).toHaveBeenCalledWith(
      context(),
      expect.objectContaining({
        mode: 'weakness_review',
        questionIds: ['question-1'],
      }),
    );
  });

  it('keeps a disabled mistake visible but rejects a new review session', async () => {
    const record = evaluationRecord({ status: 'disabled' });
    const { service, commands } = createService({ record });

    await expect(service.startReview(context(), 'evaluation-1')).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({ code: 'MISTAKE_REVIEW_UNAVAILABLE' }),
      }),
    );
    expect(commands.create).not.toHaveBeenCalled();
  });
});

function createService(
  input: {
    records?: ReturnType<typeof evaluationRecord>[];
    record?: ReturnType<typeof evaluationRecord> | null;
    reviews?: ReturnType<typeof reviewRecord>[];
  } = {},
) {
  const records = input.records ?? [evaluationRecord({ status: 'disabled' })];
  const prisma = {
    evaluationResult: {
      findMany: jest.fn().mockResolvedValue(records),
      findFirst: jest.fn().mockResolvedValue(input.record ?? records[0] ?? null),
      count: jest.fn().mockResolvedValue(records.length),
    },
    memoryEvent: { findMany: jest.fn().mockResolvedValue([memoryEvidence()]) },
    practiceSessionItem: { findMany: jest.fn().mockResolvedValue(input.reviews ?? []) },
  };
  const commands = { create: jest.fn().mockResolvedValue({ id: 'review-session-1' }) };
  return {
    service: new PracticeMistakeBookService(prisma as never, commands as never),
    prisma,
    commands,
  };
}

function evaluationRecord(input: { status: 'published' | 'disabled' }) {
  return {
    id: 'evaluation-1',
    sessionItemId: 'item-1',
    score: 42,
    feedback: 'Missing recovery trade-offs.',
    missingPoints: ['State recovery'],
    createdAt: new Date('2026-07-29T08:00:00.000Z'),
    sessionItem: {
      id: 'item-1',
      session: { id: 'session-1', userId: 'user-1' },
      question: questionRecord(input.status),
    },
  };
}

function questionRecord(status: 'published' | 'disabled') {
  return {
    id: 'question-1',
    tenantId: 'tenant-1',
    visibility: 'tenant',
    title: 'Agent orchestration',
    stem: 'Compare orchestration strategies.',
    type: 'short_answer',
    difficulty: 'medium',
    tags: ['orchestration'],
    options: [],
    status,
  };
}

function memoryEvidence() {
  return {
    sourceId: 'session-1',
    tag: 'orchestration',
    observedScore: 42,
    evidence: '本轮练习包含 1 条「orchestration」评价证据。',
    createdAt: new Date('2026-07-29T08:01:00.000Z'),
  };
}

function reviewRecord() {
  return { questionId: 'question-1', createdAt: new Date('2026-07-29T09:00:00.000Z') };
}

function context(tenantId = 'tenant-1', userId = 'user-1'): ProductRequestContext {
  return {
    requestId: 'request-1',
    traceId: 'trace-1',
    tenantId,
    actor: { id: userId, subject: userId, tenantId, role: 'user', scopes: ['practice:read'] },
  };
}
