import type { Question } from '@interview-agent/contracts';
import { practiceCategoryTagFor } from './practice-question-categories';

const OPTION_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
const PRIMARY_RUBRIC_SCORE = 4;
const SECONDARY_RUBRIC_SCORE = 3;
const CHOICE_JUDGMENT_SCORE = 6;
const RUBRIC_SCORES = [
  PRIMARY_RUBRIC_SCORE,
  SECONDARY_RUBRIC_SCORE,
  SECONDARY_RUBRIC_SCORE,
] as const;

type AgentQuestionBaseInput = {
  suffix: string;
  title: string;
  stem: string;
  answer: string;
  difficulty: Question['difficulty'];
  tags: string[];
  sourceRefs: string[];
};

export type AgentChoiceQuestionInput = AgentQuestionBaseInput & {
  type: 'single_choice' | 'multiple_choice';
  options: string[];
  correctOptionIds: string[];
};

export type AgentOpenQuestionInput = AgentQuestionBaseInput & {
  type: 'short_answer' | 'coding' | 'system_design' | 'project_deep_dive' | 'behavioral';
  points: string[];
};

export function buildAgentChoiceQuestion(input: AgentChoiceQuestionInput): Question {
  return {
    ...questionBase(input),
    type: input.type,
    options: input.options.map((text, index) => ({ id: OPTION_IDS[index]!, text })),
    correctOptionIds: input.correctOptionIds,
    rubric: [
      {
        point: '选项判断',
        score: CHOICE_JUDGMENT_SCORE,
        description: '选择与题意完全一致的选项。',
      },
      {
        point: '概念理解',
        score: PRIMARY_RUBRIC_SCORE,
        description: '能够说明正确选项对应的核心原理。',
      },
    ],
  };
}

export function buildAgentOpenQuestion(input: AgentOpenQuestionInput): Question {
  return {
    ...questionBase(input),
    type: input.type,
    rubric: input.points.map((point, index) => ({
      point,
      score: RUBRIC_SCORES[index] ?? SECONDARY_RUBRIC_SCORE,
      description: `回答需要明确说明「${point}」的判断、做法与验证方式。`,
    })),
  };
}

function questionBase(input: AgentQuestionBaseInput) {
  return {
    id: `q-agent-bank-${input.suffix}`,
    tenantId: 'public',
    visibility: 'public' as const,
    title: input.title,
    stem: input.stem,
    difficulty: input.difficulty,
    tags: [practiceCategoryTagFor('ai_agent'), ...input.tags],
    answer: input.answer,
    sourceRefs: input.sourceRefs,
    status: 'published' as const,
  };
}
