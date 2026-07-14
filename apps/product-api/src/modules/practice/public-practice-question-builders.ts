import type { Question } from '@interview-agent/contracts';
import type { RoleCategory } from '../../common/role-category';
import { practiceCategoryTagFor } from './practice-question-categories';

const FIRST_RUBRIC_SCORE = 4;
const SECOND_RUBRIC_SCORE = 3;
const THIRD_RUBRIC_SCORE = 3;
const FALLBACK_RUBRIC_SCORE = 3;
const RUBRIC_SCORES = [FIRST_RUBRIC_SCORE, SECOND_RUBRIC_SCORE, THIRD_RUBRIC_SCORE] as const;

export type PublicPracticeQuestionInput = {
  suffix: string;
  title: string;
  stem: string;
  answer: string;
  tags: string[];
  points: string[];
};

export function buildPublicPracticeQuestions(
  category: RoleCategory,
  inputs: PublicPracticeQuestionInput[],
): Question[] {
  return inputs.map((input) => ({
    id: `q-practice-${input.suffix}`,
    tenantId: 'public',
    visibility: 'public',
    title: input.title,
    stem: input.stem,
    type: 'project_deep_dive',
    difficulty: 'medium',
    tags: [practiceCategoryTagFor(category), ...input.tags],
    answer: input.answer,
    rubric: input.points.map((point, index) => ({
      point,
      score: RUBRIC_SCORES[index] ?? FALLBACK_RUBRIC_SCORE,
      description: `回答中需要明确体现「${point}」的具体做法、判断依据和结果。`,
    })),
    sourceRefs: [`fixture://public-practice/${category}`],
    status: 'published',
  }));
}