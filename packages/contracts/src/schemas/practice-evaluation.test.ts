import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PracticeEvaluationSchema } from './practice';

const baseEvaluation = {
  id: 'evaluation-1',
  sessionItemId: 'item-1',
  score: 82,
  feedback: '回答覆盖了主要要点。',
  missingPoints: [],
  rubricScores: [{ point: '边界判断', score: 86 }],
  followUpQuestion: null,
  createdAt: '2026-08-27T00:00:00.000Z',
};

test('legacy evaluations without dimensions normalize to empty values', () => {
  const parsed = PracticeEvaluationSchema.parse(baseEvaluation);
  assert.deepEqual(parsed.dimensionScores, []);
  assert.equal(parsed.improvedAnswer, null);
});

test('database nulls for dimensions normalize to empty values', () => {
  const parsed = PracticeEvaluationSchema.parse({
    ...baseEvaluation,
    dimensionScores: null,
    improvedAnswer: null,
  });
  assert.deepEqual(parsed.dimensionScores, []);
  assert.equal(parsed.improvedAnswer, null);
});

test('a blank improved answer counts as absent', () => {
  const parsed = PracticeEvaluationSchema.parse({ ...baseEvaluation, improvedAnswer: '   ' });
  assert.equal(parsed.improvedAnswer, null);
});

test('the four fixed expression dimensions are accepted with optional comments', () => {
  const parsed = PracticeEvaluationSchema.parse({
    ...baseEvaluation,
    dimensionScores: [
      { dimension: 'structure', score: 84, comment: '按 STAR 展开完整。' },
      { dimension: 'relevance', score: 90, comment: '' },
      { dimension: 'depth', score: 72, comment: '原理层可以更深入。' },
      { dimension: 'clarity', score: 78 },
    ],
    improvedAnswer: '示范回答：先给结论，再按情境-任务-行动-结果展开。',
  });
  assert.equal(parsed.dimensionScores.length, 4);
  assert.deepEqual(parsed.dimensionScores[3], { dimension: 'clarity', score: 78, comment: '' });
  assert.ok(parsed.improvedAnswer?.includes('示范回答'));
});

test('unknown expression dimensions are rejected', () => {
  const outcome = PracticeEvaluationSchema.safeParse({
    ...baseEvaluation,
    dimensionScores: [{ dimension: 'charisma', score: 50, comment: '' }],
  });
  assert.equal(outcome.success, false);
});
