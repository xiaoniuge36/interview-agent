import type { RetrievalHit } from '@interview-agent/contracts';

const FUSION_RANK_OFFSET = 60;
const KEYWORD_WEIGHT = 0.5;
const VECTOR_WEIGHT = 0.5;

export type RankedRetrievalHit = Omit<RetrievalHit, 'score' | 'source'> & { score: number };

type MergedHit = {
  hit: RankedRetrievalHit;
  keywordRank?: number;
  vectorRank?: number;
};

export function mergeRankedHits(
  keywordHits: RankedRetrievalHit[],
  vectorHits: RankedRetrievalHit[],
  limit: number,
): RetrievalHit[] {
  const merged = new Map<string, MergedHit>();
  indexHits(merged, keywordHits, 'keywordRank');
  indexHits(merged, vectorHits, 'vectorRank');
  return Array.from(merged.values())
    .map((item) => ({
      ...item.hit,
      score: fusionScore(item),
      source: sourceFor(item),
    }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, limit);
}

function indexHits(
  destination: Map<string, MergedHit>,
  hits: RankedRetrievalHit[],
  rankField: 'keywordRank' | 'vectorRank',
) {
  for (const [index, hit] of hits.entries()) {
    const current = destination.get(hit.id) ?? { hit };
    current[rankField] = index + 1;
    destination.set(hit.id, current);
  }
}

function fusionScore(hit: MergedHit) {
  return (
    rankContribution(hit.keywordRank, KEYWORD_WEIGHT) +
    rankContribution(hit.vectorRank, VECTOR_WEIGHT)
  );
}

function rankContribution(rank: number | undefined, weight: number) {
  return rank ? weight / (FUSION_RANK_OFFSET + rank) : 0;
}

function sourceFor(hit: MergedHit): RetrievalHit['source'] {
  if (hit.keywordRank && hit.vectorRank) return 'hybrid';
  return hit.keywordRank ? 'keyword' : 'vector';
}
