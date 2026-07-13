import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';

export const QuestionDifficultySchema = z.enum(['intro', 'easy', 'medium', 'hard', 'expert']);
export const QuestionTypeSchema = z.enum([
  'short_answer',
  'coding',
  'system_design',
  'project_deep_dive',
  'behavioral',
]);
export const QuestionVisibilitySchema = z.enum(['public', 'tenant']);
export const QuestionStatusSchema = z.enum(['draft', 'published', 'disabled', 'archived']);

export const RubricPointSchema = z.object({
  point: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  score: z.number().min(0).max(CONTRACT_LIMITS.rubricScore),
  description: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
});

export const QuestionSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  visibility: QuestionVisibilitySchema,
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  stem: z.string().min(1).max(CONTRACT_LIMITS.longText),
  type: QuestionTypeSchema,
  difficulty: QuestionDifficultySchema,
  tags: z.array(z.string().max(CONTRACT_LIMITS.shortText)).max(CONTRACT_LIMITS.tags),
  answer: z.string().min(1).max(CONTRACT_LIMITS.longText),
  rubric: z.array(RubricPointSchema).max(CONTRACT_LIMITS.list),
  sourceRefs: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  status: QuestionStatusSchema,
});

export const CandidateQuestionSchema = QuestionSchema.omit({ answer: true, rubric: true });

export const CandidateReviewStatusSchema = z.enum([
  'pending',
  'needs_edit',
  'approved',
  'rejected',
]);
export const CandidateReviewSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  status: CandidateReviewStatusSchema,
  qualityScore: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  tags: z.array(z.string().max(CONTRACT_LIMITS.shortText)).max(CONTRACT_LIMITS.tags),
  sourceRefs: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  createdAt: z.string().datetime(),
});

export const TrainingPlanSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  jobIntentId: z.string().optional(),
  mode: z.enum(['agent_planned', 'manual_selected', 'weakness_review']),
  goals: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  tasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().max(CONTRACT_LIMITS.shortText),
        reason: z.string().max(CONTRACT_LIMITS.mediumText),
        questionIds: z.array(z.string()).max(CONTRACT_LIMITS.list),
      }),
    )
    .max(CONTRACT_LIMITS.list),
  status: z.enum(['planning', 'ready', 'active', 'completed', 'cancelled']),
  nextActions: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
});

export type Question = z.infer<typeof QuestionSchema>;
export type CandidateQuestion = z.infer<typeof CandidateQuestionSchema>;
export type CandidateReview = z.infer<typeof CandidateReviewSchema>;
export type TrainingPlan = z.infer<typeof TrainingPlanSchema>;
