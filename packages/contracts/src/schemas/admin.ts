import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';
import { CandidateReviewSchema, QuestionSchema } from './training';

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

export type Dashboard = z.infer<typeof DashboardSchema>;
export type ModelProfile = z.infer<typeof ModelProfileSchema>;
export type AgentRunView = z.infer<typeof AgentRunViewSchema>;
export type AuditLogView = z.infer<typeof AuditLogViewSchema>;
