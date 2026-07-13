import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';
import { InterviewStageSchema } from './interview';

export const MemoryEventSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  eventType: z.enum(['skill_delta', 'risk_signal', 'strength_confirmed', 'next_action']),
  sourceId: z.string().min(1),
  evidence: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  delta: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
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

export type MemoryEvent = z.infer<typeof MemoryEventSchema>;
export type StageScore = z.infer<typeof StageScoreSchema>;
export type InterviewReport = z.infer<typeof InterviewReportSchema>;
