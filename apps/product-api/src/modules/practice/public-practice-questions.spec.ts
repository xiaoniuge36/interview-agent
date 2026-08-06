import { QuestionSchema } from '@interview-agent/contracts';
import { type RoleCategory } from '../../common/role-category';
import { practiceCategoryTagFor } from './practice-question-categories';
import { PUBLIC_PRACTICE_QUESTIONS } from './public-practice-questions';

const CATEGORIES: RoleCategory[] = [
  'engineering',
  'data',
  'ai_agent',
  'product_design',
  'growth_operations',
  'business_delivery',
  'generic',
];

describe('PUBLIC_PRACTICE_QUESTIONS', () => {
  it('为每个岗位类别提供至少五道可用题目并扩充 Agent 专题', () => {
    expect(PUBLIC_PRACTICE_QUESTIONS).toHaveLength(69);
    CATEGORIES.forEach((category) => {
      const questions = PUBLIC_PRACTICE_QUESTIONS.filter((question) =>
        question.tags.includes(practiceCategoryTagFor(category)),
      );
      expect(questions.length).toBeGreaterThanOrEqual(5);
    });
  });

  it('包含十二道单选题、八道多选题且题目 ID 唯一', () => {
    expect(
      PUBLIC_PRACTICE_QUESTIONS.filter((question) => question.type === 'single_choice'),
    ).toHaveLength(12);
    expect(
      PUBLIC_PRACTICE_QUESTIONS.filter((question) => question.type === 'multiple_choice'),
    ).toHaveLength(8);
    expect(new Set(PUBLIC_PRACTICE_QUESTIONS.map((question) => question.id)).size).toBe(
      PUBLIC_PRACTICE_QUESTIONS.length,
    );
  });

  it('全部满足共享题目契约', () => {
    PUBLIC_PRACTICE_QUESTIONS.forEach((question) => {
      expect(QuestionSchema.parse(question)).toEqual(question);
    });
  });

  it('包含 Agent Loop 分层关系与最小实现题', () => {
    const questionsById = new Map(
      PUBLIC_PRACTICE_QUESTIONS.map((question) => [question.id, question]),
    );

    expect(questionsById.get('q-agent-bank-open-loop-react-function-layering')).toEqual(
      expect.objectContaining({
        title: 'Agent Loop、ReAct 与 Function Calling 的关系是什么？',
        type: 'short_answer',
        tags: expect.arrayContaining(['Agent Loop', 'ReAct', 'Function Calling']),
      }),
    );
    expect(questionsById.get('q-agent-bank-open-minimal-agent-loop')).toEqual(
      expect.objectContaining({
        title: '如何用 Go 实现一个最小可用的 Agent Loop？',
        type: 'coding',
        tags: expect.arrayContaining(['Agent Loop', 'Go', 'Tool Calling']),
      }),
    );
  });
});
