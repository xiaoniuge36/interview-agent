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
    expect(PUBLIC_PRACTICE_QUESTIONS).toHaveLength(67);
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
});
