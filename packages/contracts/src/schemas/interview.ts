import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';

export const InterviewStageSchema = z.enum([
  'warmup',
  'self_intro',
  'tech_basics',
  'jd_core',
  'project_deep_dive',
  'scenario_design',
  'hr',
  'final_evaluation',
  'report_ready',
  'memory_updated',
]);

export const InterviewSessionStatusSchema = z.enum([
  'created',
  'running',
  'waiting_user',
  'generating_report',
  'report_ready',
  'failed',
  'cancelled',
]);

export const InterviewTurnRoleSchema = z.enum(['interviewer', 'candidate', 'system']);

export const InterviewTurnSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  commandId: z.string().min(1),
  role: InterviewTurnRoleSchema,
  stage: InterviewStageSchema,
  content: z.string().min(1).max(CONTRACT_LIMITS.longText),
  structuredPayload: z.record(z.unknown()).optional(),
  traceId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
  createdAt: z.string().datetime(),
});

export const InterviewSessionSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  jobIntentId: z.string().optional(),
  status: InterviewSessionStatusSchema,
  stage: InterviewStageSchema,
  version: z.number().int().nonnegative(),
  eventSequence: z.number().int().nonnegative(),
  workflowRunId: z.string().min(1),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  turns: z.array(InterviewTurnSchema).max(CONTRACT_LIMITS.turns),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const InterviewListSchema = z.array(InterviewSessionSchema).max(CONTRACT_LIMITS.mediumList);
export const AgentRuntimeContractVersionSchema = z.literal('interview-runtime.v1');

export const AgentRuntimeTurnContextSchema = z.object({
  role: InterviewTurnRoleSchema,
  stage: InterviewStageSchema,
  content: z.string().min(1).max(CONTRACT_LIMITS.runtimeTurnText),
});

export const AgentRuntimeSessionContextSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  status: InterviewSessionStatusSchema,
  stage: InterviewStageSchema,
  version: z.number().int().nonnegative(),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  candidateTurnCount: z.number().int().nonnegative(),
  recentTurns: z.array(AgentRuntimeTurnContextSchema).max(CONTRACT_LIMITS.runtimeTurns),
});

export const AgentRuntimeNextRequestSchema = z.object({
  contractVersion: AgentRuntimeContractVersionSchema,
  session: AgentRuntimeSessionContextSchema,
  commandId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  traceId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
  answer: z.string().trim().min(1).max(CONTRACT_LIMITS.longText).optional(),
});

export const AgentRuntimeNextResponseSchema = z.object({
  contractVersion: AgentRuntimeContractVersionSchema,
  stage: InterviewStageSchema,
  content: z.string().trim().min(1).max(CONTRACT_LIMITS.longText),
  shouldFinish: z.boolean(),
  basisSummary: z.array(z.string().trim().min(1).max(CONTRACT_LIMITS.mediumText)).max(3).optional(),
});

export const StartInterviewInputSchema = z.object({
  jobIntentId: z.string().min(1).max(CONTRACT_LIMITS.shortText).optional(),
  title: z.string().trim().min(2).max(CONTRACT_LIMITS.shortText).default('Agent 模拟面试'),
  focusTags: z
    .array(z.string().trim().min(1).max(CONTRACT_LIMITS.shortText))
    .max(CONTRACT_LIMITS.tags)
    .default([]),
});

export const SubmitInterviewAnswerInputSchema = z.object({
  answer: z.string().trim().min(1).max(CONTRACT_LIMITS.longText),
  expectedVersion: z.number().int().nonnegative(),
});

export const AdvanceInterviewInputSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
});

const StreamEventMetadataSchema = z.object({
  eventId: z.string().min(1),
  sessionId: z.string().min(1),
  commandId: z.string().min(1),
  sequence: z.number().int().positive(),
  occurredAt: z.string().datetime(),
  traceId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
});

export const AgentStreamEventSchema = z.discriminatedUnion('type', [
  StreamEventMetadataSchema.extend({ type: z.literal('workflow_started') }),
  StreamEventMetadataSchema.extend({
    type: z.literal('stage_changed'),
    stage: InterviewStageSchema,
  }),
  StreamEventMetadataSchema.extend({
    type: z.literal('token'),
    content: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  }),
  StreamEventMetadataSchema.extend({
    type: z.literal('turn_completed'),
    turn: InterviewTurnSchema,
  }),
  StreamEventMetadataSchema.extend({
    type: z.literal('report_ready'),
    reportId: z.string().min(1),
  }),
  StreamEventMetadataSchema.extend({
    type: z.literal('error'),
    code: z.string().min(1).max(CONTRACT_LIMITS.errorCode),
    message: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  }),
]);

export const InterviewCommandResultSchema = z.object({
  commandId: z.string().min(1),
  sessionId: z.string().min(1),
  sessionVersion: z.number().int().nonnegative(),
  eventCursor: z.number().int().nonnegative(),
  replayed: z.boolean(),
  session: InterviewSessionSchema,
});

export type InterviewStage = z.infer<typeof InterviewStageSchema>;
export type InterviewSessionStatus = z.infer<typeof InterviewSessionStatusSchema>;
export type InterviewTurnRole = z.infer<typeof InterviewTurnRoleSchema>;
export type InterviewTurn = z.infer<typeof InterviewTurnSchema>;
export type InterviewSession = z.infer<typeof InterviewSessionSchema>;
export type AgentRuntimeSessionContext = z.infer<typeof AgentRuntimeSessionContextSchema>;
export type AgentRuntimeNextRequest = z.infer<typeof AgentRuntimeNextRequestSchema>;
export type AgentRuntimeNextResponse = z.infer<typeof AgentRuntimeNextResponseSchema>;
export type StartInterviewInput = z.infer<typeof StartInterviewInputSchema>;
export type SubmitInterviewAnswerInput = z.infer<typeof SubmitInterviewAnswerInputSchema>;
export type AdvanceInterviewInput = z.infer<typeof AdvanceInterviewInputSchema>;
export type AgentStreamEvent = z.infer<typeof AgentStreamEventSchema>;
export type InterviewCommandResult = z.infer<typeof InterviewCommandResultSchema>;
