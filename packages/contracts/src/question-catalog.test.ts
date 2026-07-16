import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PracticeRecommendationListSchema,
  QuestionCatalogResponseSchema,
  RecentPracticeResponseSchema,
  RecentPracticeSummarySchema,
} from './schemas/question-catalog';
import { PracticeItemFeedbackSchema, PracticeItemSolutionSchema } from './schemas/practice';

const question = {
  id: 'question-1',
  tenantId: 'public',
  visibility: 'public',
  title: '如何设计多步骤 Agent 工作流？',
  stem: '说明任务拆解、状态管理和失败恢复。',
  type: 'system_design',
  difficulty: 'hard',
  tags: ['Agent 工作流', '状态管理'],
  sourceRefs: [],
  status: 'published',
};

test('题库目录只返回用户可浏览的题目摘要', () => {
  const result = QuestionCatalogResponseSchema.parse({
    items: [question],
    facets: {
      categories: [{ value: 'ai_agent', label: 'AI Agent', count: 1 }],
      difficulties: [{ value: 'hard', label: '高阶', count: 1 }],
      types: [{ value: 'system_design', label: '系统设计', count: 1 }],
      tags: [{ value: 'Agent 工作流', label: 'Agent 工作流', count: 1 }],
    },
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  });

  assert.equal('answer' in result.items[0]!, false);
  assert.equal('rubric' in result.items[0]!, false);
});

test('推荐题单最多包含十道题并说明推荐原因', () => {
  const result = PracticeRecommendationListSchema.parse([
    {
      id: 'recommendation-ai-agent',
      title: 'AI Agent 强化题单',
      reason: '目标岗位与最近薄弱能力均包含 Agent 方案设计。',
      source: 'job',
      category: 'ai_agent',
      estimatedMinutes: 20,
      questionIds: ['question-1'],
    },
  ]);

  assert.equal(result[0]!.questionIds.length, 1);
  assert.equal(
    PracticeRecommendationListSchema.safeParse([
      { ...result[0], questionIds: Array.from({ length: 11 }, (_, index) => `q-${index}`) },
    ]).success,
    false,
  );
});

test('最近练习摘要与逐题反馈支持恢复学习状态', () => {
  const recent = RecentPracticeSummarySchema.parse({
    id: 'session-1',
    title: '系统设计强化',
    mode: 'manual',
    status: 'in_progress',
    questionCount: 5,
    answeredCount: 2,
    updatedAt: '2026-07-15T00:00:00.000Z',
  });
  const feedback = PracticeItemFeedbackSchema.parse({
    evaluation: {
      id: 'evaluation-1',
      sessionItemId: 'item-1',
      score: 82,
      feedback: '回答覆盖了主要边界，但失败恢复仍需展开。',
      missingPoints: ['失败恢复'],
      rubricScores: [{ point: '系统边界', score: 90 }],
      followUpQuestion: '请进一步说明支付失败后的补偿策略。',
      createdAt: '2026-07-15T00:00:00.000Z',
    },
    referenceAnswer: '先明确职责边界，再设计幂等、补偿和恢复机制。',
    rubric: [{ point: '系统边界', score: 10, description: '清晰说明模块职责。' }],
  });

  assert.equal(recent.answeredCount, 2);
  assert.match(feedback.evaluation.followUpQuestion ?? '', /补偿策略/);
  assert.equal(
    PracticeItemSolutionSchema.parse({
      referenceAnswer: feedback.referenceAnswer,
      rubric: feedback.rubric,
    }).rubric.length,
    1,
  );
  assert.equal(RecentPracticeResponseSchema.parse(null), null);
});
