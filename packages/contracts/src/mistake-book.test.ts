import assert from 'node:assert/strict';
import test from 'node:test';
import { MistakeBookQuerySchema, MistakeBookSchema } from './schemas/practice';

test('mistake book query applies bounded pagination defaults', () => {
  assert.deepEqual(MistakeBookQuerySchema.parse({}), { page: 1, pageSize: 20, sort: 'recent' });
  assert.equal(MistakeBookQuerySchema.safeParse({ pageSize: 101 }).success, false);
});

test('mistake book query accepts the priority sort and rejects unknown sorts', () => {
  assert.equal(MistakeBookQuerySchema.parse({ sort: 'priority' }).sort, 'priority');
  assert.equal(MistakeBookQuerySchema.safeParse({ sort: 'hardest' }).success, false);
});

test('mistake book keeps an unavailable historical snapshot and review evidence', () => {
  const result = MistakeBookSchema.parse({
    items: [
      {
        id: 'evaluation-1',
        practiceItemId: 'item-1',
        questionSnapshot: {
          id: 'question-1',
          title: 'Explain agent orchestration',
          stem: 'Compare two orchestration strategies.',
          type: 'short_answer',
          difficulty: 'medium',
          tags: ['agent-orchestration'],
          options: [],
        },
        score: 42,
        feedback: 'Missing state transition trade-offs.',
        missingPoints: ['State recovery'],
        evidence: [
          {
            tag: 'agent-orchestration',
            evidence: '本轮练习包含 1 条评价证据。',
            observedScore: 42,
            createdAt: '2026-07-29T08:00:00.000Z',
          },
        ],
        evaluatedAt: '2026-07-29T08:00:00.000Z',
        reviewedAt: null,
        canStartReview: false,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  });

  assert.equal(result.items[0]?.canStartReview, false);
  assert.equal(result.items[0]?.questionSnapshot.title, 'Explain agent orchestration');
});
