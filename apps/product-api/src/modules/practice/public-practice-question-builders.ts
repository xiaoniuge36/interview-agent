import type { Question } from '@interview-agent/contracts';
import type { RoleCategory } from '../../common/role-category';
import { practiceCategoryTagFor } from './practice-question-categories';

const FIRST_RUBRIC_SCORE = 4;
const SECOND_RUBRIC_SCORE = 3;
const THIRD_RUBRIC_SCORE = 3;
const FALLBACK_RUBRIC_SCORE = 3;
const RUBRIC_SCORES = [FIRST_RUBRIC_SCORE, SECOND_RUBRIC_SCORE, THIRD_RUBRIC_SCORE] as const;
const CHOICE_OPTION_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
const CHOICE_JUDGMENT_SCORE = 6;

/** 主观题子集：客观题（选择题）结构不同，走独立定义文件。 */
type SubjectiveQuestionType =
  | 'short_answer'
  | 'behavioral'
  | 'project_deep_dive'
  | 'system_design'
  | 'coding';

export type PublicPracticeQuestionInput = {
  suffix: string;
  title: string;
  stem: string;
  answer: string;
  tags: string[];
  points: string[];
  type?: SubjectiveQuestionType;
  difficulty?: Question['difficulty'];
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
    type: input.type ?? 'project_deep_dive',
    difficulty: input.difficulty ?? 'medium',
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

export type PublicChoiceQuestionInput = {
  suffix: string;
  title: string;
  stem: string;
  answer: string;
  tags: string[];
  options: string[];
  correctOptionIds: string[];
  type?: 'single_choice' | 'multiple_choice';
  difficulty?: Question['difficulty'];
};

/** 客观题（选择题）builder：让非 AI 方向也能提供快速自测型题目。 */
export function buildPublicChoiceQuestions(
  category: RoleCategory,
  inputs: PublicChoiceQuestionInput[],
): Question[] {
  return inputs.map((input) => ({
    id: `q-practice-${input.suffix}`,
    tenantId: 'public',
    visibility: 'public',
    title: input.title,
    stem: input.stem,
    type: input.type ?? 'single_choice',
    difficulty: input.difficulty ?? 'easy',
    tags: [practiceCategoryTagFor(category), ...input.tags],
    answer: input.answer,
    options: input.options.map((text, index) => ({ id: CHOICE_OPTION_IDS[index]!, text })),
    correctOptionIds: input.correctOptionIds,
    rubric: [
      { point: '选项判断', score: CHOICE_JUDGMENT_SCORE, description: '选择与题意一致的选项。' },
      {
        point: '概念理解',
        score: FIRST_RUBRIC_SCORE,
        description: '能够说明正确选项对应的核心原理。',
      },
    ],
    sourceRefs: [`fixture://public-practice/${category}`],
    status: 'published',
  }));
}
