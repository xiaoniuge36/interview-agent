import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StarMaterialSchema } from './practice';

const base = {
  id: 'eval-1',
  practiceItemId: 'item-1',
  questionId: 'q-1',
  questionTitle: '讲一次你主导的高风险发布',
  questionType: 'behavioral',
  tags: ['发布'],
  answer: '我主导了灰度发布方案。',
  improvedAnswer: null,
  score: 84,
  evaluatedAt: '2026-08-27T10:00:00.000Z',
};

test('star material accepts behavioral and project questions with defaulted dimensions', () => {
  const parsed = StarMaterialSchema.parse(base);
  assert.deepEqual(parsed.dimensionScores, []);
  assert.equal(parsed.improvedAnswer, null);

  const project = StarMaterialSchema.parse({
    ...base,
    questionType: 'project_deep_dive',
    improvedAnswer: '示范回答',
    dimensionScores: [{ dimension: 'structure', score: 80, comment: '结构完整' }],
  });
  assert.equal(project.questionType, 'project_deep_dive');
  assert.equal(project.dimensionScores.length, 1);
});

test('star material rejects question types outside the material scope', () => {
  assert.throws(() => StarMaterialSchema.parse({ ...base, questionType: 'coding' }));
});
