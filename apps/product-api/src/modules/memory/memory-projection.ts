export type MemoryObservation = {
  observedScore: number;
  confidence: number;
  sourceId: string;
};

export type MasteryState = {
  score: number;
  evidenceCount: number;
  weightedEvidence: number;
  lastEvidenceSessionId: string | null;
};

export type MasteryProjection = MasteryState & {
  trend: 'rising' | 'stable' | 'falling';
};

const LOW_SCORE_THRESHOLD = 60;
const CONFIDENCE_FLOOR = 0.25;

export function projectMastery(
  current: MasteryState | null,
  event: MemoryObservation,
): MasteryProjection {
  const weight = Math.max(CONFIDENCE_FLOOR, event.confidence);
  const priorWeight = current?.weightedEvidence ?? 0;
  const weightedEvidence = priorWeight + weight;
  const score =
    ((current?.score ?? 0) * priorWeight + event.observedScore * weight) / weightedEvidence;
  return {
    score,
    weightedEvidence,
    evidenceCount: (current?.evidenceCount ?? 0) + 1,
    lastEvidenceSessionId: event.sourceId,
    trend: trendFor(current?.score, score),
  };
}

function trendFor(previousScore: number | undefined, score: number): MasteryProjection['trend'] {
  if (previousScore === undefined) return score < LOW_SCORE_THRESHOLD ? 'falling' : 'stable';
  if (score > previousScore) return 'rising';
  if (score < previousScore) return 'falling';
  return 'stable';
}
