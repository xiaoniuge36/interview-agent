import {
  PRACTICE_EVALUATION_DIMENSIONS,
  type PracticeDimensionScore,
  type PracticeEvaluationDimension,
} from '@interview-agent/contracts';

export const DIMENSION_LABELS: Record<PracticeEvaluationDimension, string> = {
  structure: '结构条理',
  relevance: '切题聚焦',
  depth: '深度原理',
  clarity: '清晰具体',
};

/** 按固定四维顺序整理评分，去除重复维度；旧评价记录无维度时返回空数组。 */
export function orderedDimensionScores(
  scores: readonly PracticeDimensionScore[],
): PracticeDimensionScore[] {
  return PRACTICE_EVALUATION_DIMENSIONS.flatMap((dimension) => {
    const match = scores.find((score) => score.dimension === dimension);
    return match ? [match] : [];
  });
}
