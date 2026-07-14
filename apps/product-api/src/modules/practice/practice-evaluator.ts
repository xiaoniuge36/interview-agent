import type { RubricPoint } from '@interview-agent/contracts';
import { isPracticeCategoryTag } from './practice-question-categories';

const IDEAL_ANSWER_LENGTH = 500;
const MINIMUM_SCORE = 20;
const KEYWORD_SCORE = 15;
const RUBRIC_SCORE = 30;
const EXACT_RUBRIC_MATCH_SCORE = 20;
const LENGTH_SCORE = 15;
const MAX_SCORE = 100;
const MIN_RUBRIC_SCORE = 60;
const MAX_KEYWORDS = 12;
const DEFAULT_RUBRIC_SCORE = 50;
const STRONG_ANSWER_SCORE = 80;
const LOW_KEYWORD_COVERAGE = 0.25;
const LOW_LENGTH_COVERAGE = 0.4;
const MAX_CHINESE_TERM_LENGTH = 6;
const CHINESE_TERM_EDGE_LENGTH = 4;

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
    const keywords = keywordSet(input.referenceAnswer, input.rubric, input.tags);
    const matched = keywords.filter((keyword) => normalizedAnswer.includes(keyword));
    const coverage = keywords.length ? matched.length / keywords.length : 0;
    const lengthRatio = Math.min(input.answer.trim().length / IDEAL_ANSWER_LENGTH, 1);
    const rubricScores = scoreRubric(input.rubric, normalizedAnswer);
    const rubricCoverage = input.rubric.length
      ? rubricScores.filter((item) => item.score >= MIN_RUBRIC_SCORE).length / input.rubric.length
      : 0;
    const exactRubricCoverage = input.rubric.length
      ? rubricScores.filter((item) => item.score === MAX_SCORE).length / input.rubric.length
      : 0;
    const score = Math.round(
      MINIMUM_SCORE +
        coverage * KEYWORD_SCORE +
        rubricCoverage * RUBRIC_SCORE +
        exactRubricCoverage * EXACT_RUBRIC_MATCH_SCORE +
        lengthRatio * LENGTH_SCORE,
    );
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

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function keywordSet(reference: string, rubric: RubricPoint[], tags: string[]): string[] {
  const rubricTerms = rubric.flatMap((item) => [
    normalize(item.point),
    ...keywordsFromText(item.description),
  ]);
  const candidates = [
    ...tags.filter((tag) => !isPracticeCategoryTag(tag)).map(normalize),
    ...rubricTerms,
    ...keywordsFromText(reference),
  ];
  return unique(candidates)
    .filter((keyword) => keyword.length >= 2)
    .slice(0, MAX_KEYWORDS);
}

function scoreRubric(rubric: RubricPoint[], answer: string) {
  return rubric.map((item) => {
    const point = normalize(item.point);
    if (answer.includes(point)) return { point: item.point, score: MAX_SCORE };
    const keywords = keywordsFromText(item.description);
    const matches = keywords.filter((keyword) => answer.includes(keyword)).length;
    const score = keywords.length
      ? Math.round((matches / keywords.length) * MAX_SCORE)
      : DEFAULT_RUBRIC_SCORE;
    return { point: item.point, score };
  });
}

function keywordsFromText(value: string): string[] {
  const english = normalize(value).match(/[a-z][a-z0-9_-]{3,}/g) ?? [];
  const chinese = normalize(value)
    .split(/[，。；、：,.!?！？「」()（）\s]+/)
    .flatMap(chineseTerms);
  return unique([...english, ...chinese]);
}

function chineseTerms(value: string): string[] {
  const sequences = value.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  return sequences.flatMap((sequence) => {
    if (sequence.length <= MAX_CHINESE_TERM_LENGTH) return [sequence];
    return [sequence.slice(0, CHINESE_TERM_EDGE_LENGTH), sequence.slice(-CHINESE_TERM_EDGE_LENGTH)];
  });
}

function feedbackFor(score: number, coverage: number, lengthRatio: number): string {
  if (score >= STRONG_ANSWER_SCORE) return '本次回答覆盖了核心能力点，且细节充分。';
  if (coverage < LOW_KEYWORD_COVERAGE) return '本次回答需要补充题目要求的关键判断和专业术语。';
  if (lengthRatio < LOW_LENGTH_COVERAGE)
    return '本次回答需要结合真实案例，说明判断依据、行动与结果。';
  return '本次回答已覆盖部分要点，建议围绕待强化能力补充更具体的证据。';
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
