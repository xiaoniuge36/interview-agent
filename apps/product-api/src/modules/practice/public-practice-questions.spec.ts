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
  it('为每个岗位类别提供至少五道可用题目', () => {
    expect(PUBLIC_PRACTICE_QUESTIONS).toHaveLength(35);
    CATEGORIES.forEach((category) => {
      const questions = PUBLIC_PRACTICE_QUESTIONS.filter((question) =>
        question.tags.includes(practiceCategoryTagFor(category)),
      );
      expect(questions).toHaveLength(5);
    });
  });

  it('全部满足共享题目契约', () => {
    PUBLIC_PRACTICE_QUESTIONS.forEach((question) => {
      expect(QuestionSchema.parse(question)).toEqual(question);
    });
  });
});
