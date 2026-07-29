import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';
import { AgentRuntimeRetrievalContextSchema, InterviewStageSchema } from './interview';

const MAX_PRACTICE_REPORT_EVALUATIONS = 10;
const MAX_PRACTICE_REPORT_SOURCES = 6;
const MIN_MODEL_INVOCATION_GRANT_LENGTH = 16;
const MAX_MODEL_INVOCATION_GRANT_LENGTH = 4096;

export const MemoryEventSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  schemaVersion: z.literal(1),
  dedupeKey: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  sourceType: z.enum(['practice', 'interview']),
  eventType: z.enum(['skill_observation', 'risk_signal', 'strength_confirmed', 'next_action']),
  sourceId: z.string().min(1),
  tag: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  observedScore: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  evidence: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  delta: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  traceId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
  createdAt: z.string().datetime(),
});

export const StageScoreSchema = z.object({
  stage: InterviewStageSchema,
  score: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  summary: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  evidence: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
});

export const InterviewReportSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  overall: z.object({
    score: z.number().min(0).max(CONTRACT_LIMITS.percentage),
    summary: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
    hiringSignal: z.enum(['strong_yes', 'yes', 'mixed', 'weak', 'no']),
  }),
  stageScores: z.array(StageScoreSchema).max(CONTRACT_LIMITS.list),
  turnFeedback: z
    .array(
      z.object({
        turnId: z.string().min(1),
        feedback: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
        missingPoints: z
          .array(z.string().max(CONTRACT_LIMITS.mediumText))
          .max(CONTRACT_LIMITS.list),
      }),
    )
    .max(CONTRACT_LIMITS.turns),
  projectDiagnosis: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  nextActions: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  memoryEvents: z.array(MemoryEventSchema).max(CONTRACT_LIMITS.list),
  createdAt: z.string().datetime(),
});

export const PracticeReportRuntimeEvaluationSchema = z.object({
  itemId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  questionId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  questionTitle: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  questionTags: z.array(z.string().min(1).max(CONTRACT_LIMITS.shortText)).max(CONTRACT_LIMITS.tags),
  score: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  feedback: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  missingPoints: z
    .array(z.string().min(1).max(CONTRACT_LIMITS.mediumText))
    .max(CONTRACT_LIMITS.list),
});

export const PracticeReportRuntimeRequestSchema = z.object({
  contractVersion: z.literal('practice-report-runtime.v1'),
  session: z.object({
    id: z.string().min(1).max(CONTRACT_LIMITS.shortText),
    tenantId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
    userId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
    title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  }),
  evaluations: z
    .array(PracticeReportRuntimeEvaluationSchema)
    .min(1)
    .max(MAX_PRACTICE_REPORT_EVALUATIONS),
  retrievalContext: z
    .array(AgentRuntimeRetrievalContextSchema)
    .max(MAX_PRACTICE_REPORT_SOURCES)
    .optional(),
  commandId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  traceId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
  modelInvocationGrant: z
    .string()
    .trim()
    .min(MIN_MODEL_INVOCATION_GRANT_LENGTH)
    .max(MAX_MODEL_INVOCATION_GRANT_LENGTH)
    .optional(),
});

export const PracticeReportRuntimeMemoryEventSchema = z.object({
  tag: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  observedScore: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  evidence: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
});

export const PracticeReportRuntimeResponseSchema = z.object({
  contractVersion: z.literal('practice-report-runtime.v1'),
  overallScore: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  summary: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  strengths: z.array(z.string().min(1).max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  weaknesses: z.array(z.string().min(1).max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  nextActions: z.array(z.string().min(1).max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  reportMarkdown: z.string().min(1).max(CONTRACT_LIMITS.longText),
  sourceIds: z
    .array(z.string().min(1).max(CONTRACT_LIMITS.shortText))
    .max(MAX_PRACTICE_REPORT_SOURCES),
  memoryEvents: z.array(PracticeReportRuntimeMemoryEventSchema).max(CONTRACT_LIMITS.list),
  fallbackUsed: z.boolean(),
});

export type MemoryEvent = z.infer<typeof MemoryEventSchema>;
export type StageScore = z.infer<typeof StageScoreSchema>;
export type InterviewReport = z.infer<typeof InterviewReportSchema>;
export type PracticeReportRuntimeEvaluation = z.infer<typeof PracticeReportRuntimeEvaluationSchema>;
export type PracticeReportRuntimeRequest = z.infer<typeof PracticeReportRuntimeRequestSchema>;
export type PracticeReportRuntimeResponse = z.infer<typeof PracticeReportRuntimeResponseSchema>;
