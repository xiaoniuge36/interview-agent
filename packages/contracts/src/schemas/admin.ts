import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';
import {
  CandidateReviewSchema,
  CandidateReviewStatusSchema,
  ImportTaskStatusSchema,
  QuestionDifficultySchema,
  QuestionSchema,
  QuestionStatusSchema,
} from './training';

const ADMIN_PAGE_DEFAULT = 1;
const ADMIN_PAGE_SIZE_DEFAULT = 20;
const ADMIN_PAGE_SIZE_MAX = 100;
const ADMIN_KEYWORD_MAX_LENGTH = 120;

export const AdminPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(ADMIN_PAGE_DEFAULT).default(ADMIN_PAGE_DEFAULT),
  pageSize: z.coerce
    .number()
    .int()
    .min(ADMIN_PAGE_DEFAULT)
    .max(ADMIN_PAGE_SIZE_MAX)
    .default(ADMIN_PAGE_SIZE_DEFAULT),
  keyword: z.string().trim().max(ADMIN_KEYWORD_MAX_LENGTH).optional(),
});

export const AdminPageSchema = <ItemSchema extends z.ZodTypeAny>(itemSchema: ItemSchema) =>
  z.object({
    items: z.array(itemSchema).max(ADMIN_PAGE_SIZE_MAX),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(ADMIN_PAGE_DEFAULT),
    pageSize: z.number().int().min(ADMIN_PAGE_DEFAULT).max(ADMIN_PAGE_SIZE_MAX),
  });

export const ModelProfileSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  model: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  purpose: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  status: z.enum(['active', 'standby', 'disabled']),
  budget: z.enum(['low', 'medium', 'high']),
  schemaMode: z.boolean(),
  updatedAt: z.string().datetime(),
});

export const AgentRunViewSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().nullable(),
  type: z.enum(['mock_interview']),
  status: z.enum(['running', 'succeeded', 'failed', 'fallback']),
  stage: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  traceId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
  latencyMs: z.number().int().nonnegative().nullable(),
  schemaValid: z.boolean().nullable(),
  fallbackUsed: z.boolean(),
  attemptCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export const AuditLogViewSchema = z.object({
  id: z.string().min(1),
  action: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  resourceType: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  resourceId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  actorId: z.string().min(1),
  actorRole: z.string().min(1),
  traceId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
  result: z.enum(['success', 'failure']),
  createdAt: z.string().datetime(),
});

export const DashboardSchema = z.object({
  stats: z.object({
    publishedQuestions: z.number().int().nonnegative(),
    pendingCandidates: z.number().int().nonnegative(),
    activeInterviews: z.number().int().nonnegative(),
    reportsReady: z.number().int().nonnegative(),
    schemaPassRate: z.number().min(0).max(CONTRACT_LIMITS.percentage),
    avgLatencyMs: z.number().nonnegative(),
  }),
  importPipeline: z.array(
    z.object({
      stage: z.enum(['received', 'processing', 'review', 'published', 'failed']),
      count: z.number().int().nonnegative(),
    }),
  ),
  recentRuns: z.array(AgentRunViewSchema).max(CONTRACT_LIMITS.recentRuns),
});

export const QuestionListSchema = z.array(QuestionSchema).max(CONTRACT_LIMITS.largeList);
export const CandidateReviewListSchema = z
  .array(CandidateReviewSchema)
  .max(CONTRACT_LIMITS.largeList);
export const ModelProfileListSchema = z.array(ModelProfileSchema).max(CONTRACT_LIMITS.mediumList);
export const AgentRunListSchema = z.array(AgentRunViewSchema).max(CONTRACT_LIMITS.largeList);
export const AuditLogListSchema = z.array(AuditLogViewSchema).max(CONTRACT_LIMITS.largeList);

export const ImportTaskListQuerySchema = AdminPaginationQuerySchema.extend({
  status: ImportTaskStatusSchema.optional(),
});

export const QuestionListQuerySchema = AdminPaginationQuerySchema.extend({
  status: QuestionStatusSchema.optional(),
  difficulty: QuestionDifficultySchema.optional(),
});

export const CandidateReviewListQuerySchema = AdminPaginationQuerySchema.extend({
  status: CandidateReviewStatusSchema.optional(),
  importTaskId: z.string().min(1).optional(),
});

export const ModelProfileListQuerySchema = AdminPaginationQuerySchema.extend({
  status: ModelProfileSchema.shape.status.optional(),
});

export const AgentRunListQuerySchema = AdminPaginationQuerySchema.extend({
  status: AgentRunViewSchema.shape.status.optional(),
});

export const AuditLogListQuerySchema = AdminPaginationQuerySchema.extend({
  result: AuditLogViewSchema.shape.result.optional(),
});

export type Dashboard = z.infer<typeof DashboardSchema>;
export type ModelProfile = z.infer<typeof ModelProfileSchema>;
export type AgentRunView = z.infer<typeof AgentRunViewSchema>;
export type AuditLogView = z.infer<typeof AuditLogViewSchema>;
export type AdminPaginationQuery = z.infer<typeof AdminPaginationQuerySchema>;
export type ImportTaskListQuery = z.infer<typeof ImportTaskListQuerySchema>;
export type QuestionListQuery = z.infer<typeof QuestionListQuerySchema>;
export type CandidateReviewListQuery = z.infer<typeof CandidateReviewListQuerySchema>;
export type ModelProfileListQuery = z.infer<typeof ModelProfileListQuerySchema>;
export type AgentRunListQuery = z.infer<typeof AgentRunListQuerySchema>;
export type AuditLogListQuery = z.infer<typeof AuditLogListQuerySchema>;
