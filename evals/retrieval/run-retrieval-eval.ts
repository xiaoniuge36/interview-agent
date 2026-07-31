import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { mergeRankedHits } from '../../apps/product-api/src/modules/retrieval/retrieval-ranking';

const TOP_K = 5;
const CASES_PATH = resolve(process.cwd(), 'evals/retrieval/cases.json');

type RetrievalCase = {
  id: string;
  expectedIds: string[];
  keywordIds: string[];
  vectorIds: string[];
};

type Metrics = { recallAt5: number; mrr: number; ndcg: number };

async function main() {
  const cases = parseCases(await readFile(CASES_PATH, 'utf8'));
  const keyword = average(cases.map((item) => metricsFor(item.expectedIds, item.keywordIds)));
  const hybrid = average(cases.map((item) => metricsFor(item.expectedIds, hybridIds(item))));
  cases.forEach((item) => printCase(item));
  printMetrics('keyword', keyword);
  printMetrics('hybrid', hybrid);
  if (hybrid.recallAt5 < keyword.recallAt5)
    throw new Error('Hybrid Recall@5 fell below keyword baseline.');
}

function parseCases(source: string): RetrievalCase[] {
  const value: unknown = JSON.parse(source);
  if (!Array.isArray(value) || value.length !== 12 || value.some((item) => !isCase(item))) {
    throw new Error('Retrieval eval requires exactly twelve valid golden cases.');
  }
  return value;
}

function isCase(value: unknown): value is RetrievalCase {
  if (!isRecord(value) || typeof value.id !== 'string') return false;
  return ['expectedIds', 'keywordIds', 'vectorIds'].every((field) => stringArray(value[field]));
}

function metricsFor(expectedIds: string[], resultIds: string[]): Metrics {
  const expected = new Set(expectedIds);
  const ranks = resultIds
    .slice(0, TOP_K)
    .flatMap((id, index) => (expected.has(id) ? [index + 1] : []));
  return {
    recallAt5: ranks.length / expected.size,
    mrr: ranks.length ? 1 / ranks[0]! : 0,
    ndcg: discountedGain(ranks) / idealGain(expected.size),
  };
}

function average(metrics: Metrics[]): Metrics {
  const total = metrics.reduce(addMetrics, { recallAt5: 0, mrr: 0, ndcg: 0 });
  return {
    recallAt5: total.recallAt5 / metrics.length,
    mrr: total.mrr / metrics.length,
    ndcg: total.ndcg / metrics.length,
  };
}

function addMetrics(total: Metrics, next: Metrics): Metrics {
  return {
    recallAt5: total.recallAt5 + next.recallAt5,
    mrr: total.mrr + next.mrr,
    ndcg: total.ndcg + next.ndcg,
  };
}

function discountedGain(ranks: number[]) {
  return ranks.reduce((total, rank) => total + 1 / Math.log2(rank + 1), 0);
}

function idealGain(count: number) {
  return (
    discountedGain(Array.from({ length: Math.min(count, TOP_K) }, (_, index) => index + 1)) || 1
  );
}

function printCase(item: RetrievalCase) {
  const metrics = metricsFor(item.expectedIds, hybridIds(item));
  printMetrics(item.id, metrics);
}

function hybridIds(item: RetrievalCase) {
  return mergeRankedHits(item.keywordIds.map(evalHit), item.vectorIds.map(evalHit), TOP_K).map(
    (hit) => hit.id,
  );
}

function evalHit(id: string) {
  return {
    id,
    tenantId: 'eval-tenant',
    entityType: 'knowledge',
    entityId: id,
    content: id,
    metadata: {},
    score: 1,
  };
}

function printMetrics(label: string, metrics: Metrics) {
  console.log(
    `${label}: Recall@5=${metrics.recallAt5.toFixed(3)} MRR=${metrics.mrr.toFixed(3)} nDCG=${metrics.ndcg.toFixed(3)}`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string')
  );
}

void main();
