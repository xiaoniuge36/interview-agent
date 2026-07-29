import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  PracticeEvaluationSchema,
  PracticeReportRuntimeResponseSchema,
} from '@interview-agent/contracts';

const SCORE_TOLERANCE = 0.001;
const root = process.cwd();
const artifactPath = resolve(root, 'test-results/evals/agent-evals.json');

type EvaluationCase = {
  id: string;
  expectedScoreRange: [number, number];
  requiredMissingPoints: string[];
  output: unknown;
};

type ReportCase = {
  id: string;
  evaluationScores: number[];
  allowedSourceIds: string[];
  requiredWeaknesses: string[];
  output: unknown;
};

type CaseResult = { id: string; schemaPass: boolean; goldenPass: boolean; issues: string[] };

async function main() {
  const evaluationCases = await loadCases<EvaluationCase>('evals/practice-evaluation/cases.json');
  const reportCases = await loadCases<ReportCase>('evals/report/cases.json');
  const results = [
    ...evaluationCases.map(validateEvaluationCase),
    ...reportCases.map(validateReportCase),
  ];
  const judge = process.env.LLM_JUDGE_ENABLED === 'true' ? await judgeCases(results) : null;
  const artifact = buildArtifact(results, reportCases, judge);
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(artifact));
  if (results.some((result) => !result.schemaPass || !result.goldenPass)) {
    throw new Error('Agent Golden evaluation gate failed.');
  }
}

async function loadCases<T>(path: string): Promise<T[]> {
  const parsed: unknown = JSON.parse(await readFile(resolve(root, path), 'utf8'));
  if (!Array.isArray(parsed) || !parsed.length) throw new Error(`${path} must contain cases.`);
  return parsed as T[];
}

function validateEvaluationCase(item: EvaluationCase): CaseResult {
  const parsed = PracticeEvaluationSchema.safeParse(item.output);
  if (!parsed.success) return failedSchema(item.id, parsed.error.message);
  const [minimum, maximum] = item.expectedScoreRange;
  const issues = [
    ...(parsed.data.score < minimum || parsed.data.score > maximum ? ['score_range'] : []),
    ...item.requiredMissingPoints.flatMap((point) =>
      parsed.data.missingPoints.includes(point) ? [] : [`missing_point:${point}`],
    ),
  ];
  return { id: item.id, schemaPass: true, goldenPass: !issues.length, issues };
}

function validateReportCase(item: ReportCase): CaseResult {
  const parsed = PracticeReportRuntimeResponseSchema.safeParse(item.output);
  if (!parsed.success) return failedSchema(item.id, parsed.error.message);
  const expectedScore = average(item.evaluationScores);
  const allowed = new Set(item.allowedSourceIds);
  const issues = [
    ...(Math.abs(parsed.data.overallScore - expectedScore) > SCORE_TOLERANCE
      ? ['overall_score']
      : []),
    ...item.requiredWeaknesses.flatMap((point) =>
      parsed.data.weaknesses.includes(point) ? [] : [`weakness:${point}`],
    ),
    ...(parsed.data.sourceIds.some((sourceId) => !allowed.has(sourceId)) ? ['source_scope'] : []),
  ];
  return { id: item.id, schemaPass: true, goldenPass: !issues.length, issues };
}

function buildArtifact(results: CaseResult[], reports: ReportCase[], judge: unknown) {
  const passed = results.filter((result) => result.schemaPass && result.goldenPass).length;
  const fallbackCount = reports.filter((item) => {
    const parsed = PracticeReportRuntimeResponseSchema.safeParse(item.output);
    return parsed.success && parsed.data.fallbackUsed;
  }).length;
  return {
    generatedAt: new Date().toISOString(),
    schemaPass: results.every((result) => result.schemaPass),
    goldenScore: passed / results.length,
    fallbackRate: fallbackCount / reports.length,
    judge,
    results,
  };
}

async function judgeCases(results: CaseResult[]) {
  const url = process.env.LLM_JUDGE_URL;
  if (!url) throw new Error('LLM_JUDGE_URL is required when LLM Judge is enabled.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rubric: 'schema-and-grounding.v1', results }),
  });
  if (!response.ok) throw new Error(`LLM Judge failed with HTTP ${response.status}.`);
  return response.json();
}

function failedSchema(id: string, issue: string): CaseResult {
  return { id, schemaPass: false, goldenPass: false, issues: [issue] };
}

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

void main();
