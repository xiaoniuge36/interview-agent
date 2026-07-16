import type { Prisma } from '@prisma/client';
import {
  AgentRunViewSchema,
  AuditLogViewSchema,
  CandidateReviewSchema,
  ModelProfileSchema,
  QuestionSchema,
  type AgentRunListQuery,
  type AgentRunView,
  type AuditLogListQuery,
  type AuditLogView,
  type CandidateReview,
  type CandidateReviewListQuery,
  type ModelProfile,
  type ModelProfileListQuery,
  type Question,
  type QuestionListQuery,
} from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';

export function questionWhere(
  context: ProductRequestContext,
  query: QuestionListQuery,
): Prisma.QuestionWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.difficulty ? { difficulty: query.difficulty } : {}),
    AND: [
      { OR: [{ tenantId: context.tenantId }, { visibility: 'public' }] },
      ...(query.keyword ? [{ OR: textSearch(query.keyword, ['title', 'stem']) }] : []),
    ],
  };
}

export function candidateWhere(
  context: ProductRequestContext,
  query: CandidateReviewListQuery,
): Prisma.CandidateQuestionWhereInput {
  return {
    tenantId: context.tenantId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.importTaskId ? { importTaskId: query.importTaskId } : {}),
    ...(query.keyword ? { OR: textSearch(query.keyword, ['title', 'stem']) } : {}),
  };
}

export function modelProfileWhere(
  context: ProductRequestContext,
  query: ModelProfileListQuery,
): Prisma.ModelProfileWhereInput {
  return {
    tenantId: context.tenantId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.keyword ? { OR: textSearch(query.keyword, ['provider', 'model', 'purpose']) } : {}),
  };
}

export function agentRunWhere(
  context: ProductRequestContext,
  query: AgentRunListQuery,
): Prisma.AgentRunWhereInput {
  return {
    tenantId: context.tenantId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.keyword ? { OR: textSearch(query.keyword, ['stage', 'sessionId', 'traceId']) } : {}),
  };
}

export function auditLogWhere(
  context: ProductRequestContext,
  query: AuditLogListQuery,
): Prisma.AuditLogWhereInput {
  return {
    tenantId: context.tenantId,
    ...(query.result ? { result: query.result } : {}),
    ...(query.keyword
      ? {
          OR: textSearch(query.keyword, [
            'action',
            'resourceType',
            'resourceId',
            'actorId',
            'traceId',
          ]),
        }
      : {}),
  };
}

export function mapQuestion(record: Prisma.QuestionGetPayload<Record<string, never>>): Question {
  return QuestionSchema.parse(record);
}

export function mapCandidate(
  record: Prisma.CandidateQuestionGetPayload<Record<string, never>> & {
    importTask?: { id: string; title: string } | null;
  },
): CandidateReview {
  return CandidateReviewSchema.parse({
    ...record,
    sourceImport: record.importTask ?? null,
    createdAt: record.createdAt.toISOString(),
  });
}

export function mapModelProfile(
  record: Prisma.ModelProfileGetPayload<Record<string, never>>,
): ModelProfile {
  return ModelProfileSchema.parse({ ...record, updatedAt: record.updatedAt.toISOString() });
}

export function mapAgentRun(
  record: Prisma.AgentRunGetPayload<Record<string, never>>,
): AgentRunView {
  return AgentRunViewSchema.parse({ ...record, updatedAt: record.updatedAt.toISOString() });
}

export function mapAuditLog(
  record: Prisma.AuditLogGetPayload<Record<string, never>>,
): AuditLogView {
  return AuditLogViewSchema.parse({ ...record, createdAt: record.createdAt.toISOString() });
}

function textSearch(keyword: string, fields: string[]) {
  return fields.map((field) => ({ [field]: { contains: keyword, mode: 'insensitive' as const } }));
}
