import type { RubricPoint } from '@interview-agent/contracts';

const IDEAL_ANSWER_LENGTH = 500;
const MINIMUM_SCORE = 20;
const KEYWORD_SCORE = 35;
const LENGTH_SCORE = 45;
const MAX_SCORE = 100;
const MIN_RUBRIC_SCORE = 60;
const MAX_KEYWORDS = 12;
const KEYWORDS_PER_RUBRIC_POINT = 2;
const DEFAULT_RUBRIC_SCORE = 50;
const STRONG_ANSWER_SCORE = 80;
const LOW_KEYWORD_COVERAGE = 0.25;
const LOW_LENGTH_COVERAGE = 0.4;

export type EvaluationDraft = {
  score: number;
  feedback: string;
  missingPoints: string[];
  rubricScores: Array<{ point: string; score: number }>;
};

export class PracticeEvaluator {
  evaluate(input: {
    answer: string;
    referenceAnswer: string;
    rubric: RubricPoint[];
    tags: string[];
  }): EvaluationDraft {
    const normalizedAnswer = normalize(input.answer);
    const keywords = keywordSet(input.referenceAnswer, input.tags);
    const matched = keywords.filter((keyword) => normalizedAnswer.includes(keyword));
    const coverage = keywords.length ? matched.length / keywords.length : 0;
    const lengthRatio = Math.min(input.answer.trim().length / IDEAL_ANSWER_LENGTH, 1);
    const score = Math.round(MINIMUM_SCORE + coverage * KEYWORD_SCORE + lengthRatio * LENGTH_SCORE);
    const rubricScores = scoreRubric(input.rubric, normalizedAnswer, keywords);
    const missingPoints = rubricScores
      .filter((item) => item.score < MIN_RUBRIC_SCORE)
      .map((item) => item.point);
    return {
      score: Math.min(MAX_SCORE, score),
      feedback: feedbackFor(score, coverage, lengthRatio),
      missingPoints,
      rubricScores,
    };
  }
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function keywordSet(reference: string, tags: string[]) {
  const words = reference.toLocaleLowerCase().match(/[a-z][a-z0-9_-]{3,}/g) ?? [];
  return [...new Set([...tags.map((tag) => tag.toLocaleLowerCase()), ...words])].slice(
    0,
    MAX_KEYWORDS,
  );
}

function scoreRubric(rubric: RubricPoint[], answer: string, keywords: string[]) {
  return rubric.map((item, index) => {
    const relevant = keywords.slice(
      index * KEYWORDS_PER_RUBRIC_POINT,
      index * KEYWORDS_PER_RUBRIC_POINT + KEYWORDS_PER_RUBRIC_POINT,
    );
    const matches = relevant.filter((keyword) => answer.includes(keyword)).length;
    const score = relevant.length
      ? Math.round((matches / relevant.length) * MAX_SCORE)
      : DEFAULT_RUBRIC_SCORE;
    return { point: item.point, score };
  });
}

function feedbackFor(score: number, coverage: number, lengthRatio: number) {
  if (score >= STRONG_ANSWER_SCORE)
    return 'The deterministic fallback found strong coverage and sufficient detail.';
  if (coverage < LOW_KEYWORD_COVERAGE)
    return 'Add the key concepts and terminology expected by the rubric.';
  if (lengthRatio < LOW_LENGTH_COVERAGE)
    return 'Explain the reasoning with a concrete example and trade-off.';
  return 'The answer covers part of the material; strengthen the missing rubric points.';
}
