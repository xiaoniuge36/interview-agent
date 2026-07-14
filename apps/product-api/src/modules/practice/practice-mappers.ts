import type {
  EvaluationResult,
  MasteryProfile as PrismaMasteryProfile,
  PracticeReport as PrismaPracticeReport,
  Prisma,
} from '@prisma/client';
import {
  CONTRACT_LIMITS,
  MasteryProfileSchema,
  PracticeEvaluationSchema,
  PracticeReportSchema,
  PracticeSessionSchema,
  type CreatePracticeSession,
  type MasteryProfile,
  type PracticeReport,
  type PracticeSession,
} from '@interview-agent/contracts';
import { jsonValue } from '../../common/audit/audit.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { visiblePracticeTags } from './practice-question-categories';

const PERCENT_SCALE = CONTRACT_LIMITS.percentage;
const MAX_REPORTED_WEAKNESSES = 5;

export const SESSION_INCLUDE = {
  items: { orderBy: { sequence: 'asc' }, include: { question: true, evaluation: true } },
  report: true,
} satisfies Prisma.PracticeSessionInclude;

export type SessionRecord = Prisma.PracticeSessionGetPayload<{ include: typeof SESSION_INCLUDE }>;
export type EvaluationRecord = EvaluationResult;

type ReportMarkdownInput = {
  title: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  nextActions: string[];
};

export function practiceSessionData(
  context: ProductRequestContext,
  input: CreatePracticeSession,
  questions: Array<{ id: string }>,
): Prisma.PracticeSessionCreateInput {
  return {
    tenant: { connect: { id: context.tenantId } },
    user: { connect: { tenantId_id: { tenantId: context.tenantId, id: context.actor.id } } },
    ...(input.jobIntentId
      ? {
          jobIntent: {
            connect: { tenantId_id: { tenantId: context.tenantId, id: input.jobIntentId } },
          },
        }
      : {}),
    mode: input.mode ?? (input.questionIds ? 'manual' : 'smart'),
    title: input.title ?? '专项练习',
    status: 'in_progress',
    items: {
      create: questions.map((question, index) => ({
        tenant: { connect: { id: context.tenantId } },
        question: { connect: { id: question.id } },
        sequence: index + 1,
      })),
    },
  };
}

export function mapSession(record: SessionRecord): PracticeSession {
  return PracticeSessionSchema.parse({
    ...record,
    startedAt: record.startedAt.toISOString(),
    submittedAt: dateOrNull(record.submittedAt),
    reportedAt: dateOrNull(record.reportedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    items: record.items.map((item) => ({
      ...item,
      answeredAt: dateOrNull(item.answeredAt),
      question: { ...item.question, tags: visiblePracticeTags(item.question.tags) },
      evaluation: item.evaluation ? mapEvaluation(item.evaluation) : null,
    })),
  });
}

export function mapEvaluation(record: EvaluationRecord) {
  return PracticeEvaluationSchema.parse({
    ...record,
    createdAt: record.createdAt.toISOString(),
  });
}

export function createPracticeReportData(
  session: SessionRecord,
  evaluations: EvaluationRecord[],
): Prisma.PracticeReportCreateInput {
  const overallScore = average(evaluations.map((evaluation) => evaluation.score));
  const weaknesses = unique(evaluations.flatMap((evaluation) => evaluation.missingPoints)).slice(
    0,
    MAX_REPORTED_WEAKNESSES,
  );
  const strengths = weaknesses.length
    ? ['能够准确识别当前作答中的关键能力缺口，并完成题目提交。']
    : ['回答覆盖了本轮题目的关键能力点，结构与表达较为完整。'];
  const nextActions = weaknesses.length
    ? weaknesses.map((item) => `针对「${item}」补充一个真实案例，并按背景、行动、结果、复盘的顺序重新表达。`)
    : ['继续使用真实项目案例练习，强化量化结果与岗位相关性。'];
  return {
    tenant: { connect: { id: session.tenantId } },
    session: { connect: { id: session.id } },
    overallScore,
    summary: `本轮专项练习平均得分为 ${overallScore.toFixed(0)} 分。`,
    strengths,
    weaknesses,
    nextActions,
    reportMarkdown: markdownReport({
      title: session.title,
      score: overallScore,
      strengths,
      weaknesses,
      nextActions,
    }),
    structuredData: jsonValue({ evaluatorMode: 'deterministic_fallback', evaluations }),
  };
}

export function mapReport(
  report: PrismaPracticeReport,
  items: Array<{ evaluation: EvaluationRecord | null }>,
): PracticeReport {
  return PracticeReportSchema.parse({
    ...report,
    itemEvaluations: items.flatMap((item) =>
      item.evaluation ? [mapEvaluation(item.evaluation)] : [],
    ),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  });
}

export function mapMastery(record: PrismaMasteryProfile): MasteryProfile {
  return MasteryProfileSchema.parse({ ...record, updatedAt: record.updatedAt.toISOString() });
}

function markdownReport(input: ReportMarkdownInput) {
  return [
    `# ${input.title}`,
    '',
    `综合得分：${input.score.toFixed(0)}/${PERCENT_SCALE}`,
    '',
    '## 本轮亮点',
    ...input.strengths.map((item) => `- ${item}`),
    '',
    '## 待补强能力',
    ...input.weaknesses.map((item) => `- ${item}`),
    '',
    '## 下一步建议',
    ...input.nextActions.map((item) => `- ${item}`),
  ].join('\n');
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function dateOrNull(value: Date | null) {
  return value?.toISOString() ?? null;
}