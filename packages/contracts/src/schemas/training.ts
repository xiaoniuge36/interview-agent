import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';

const MIN_MARKDOWN_IMPORT_LENGTH = 20;

export const QuestionDifficultySchema = z.enum(['intro', 'easy', 'medium', 'hard', 'expert']);
export const QuestionTypeSchema = z.enum([
  'short_answer',
  'coding',
  'system_design',
  'project_deep_dive',
  'behavioral',
  'single_choice',
  'multiple_choice',
]);
export const QuestionVisibilitySchema = z.enum(['public', 'tenant']);
export const QuestionStatusSchema = z.enum(['draft', 'published', 'disabled', 'archived']);

export const RubricPointSchema = z.object({
  point: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  score: z.number().min(0).max(CONTRACT_LIMITS.rubricScore),
  description: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
});

const MIN_QUESTION_OPTIONS = 2;
const MAX_QUESTION_OPTIONS = 8;
const OBJECTIVE_QUESTION_TYPES = new Set(['single_choice', 'multiple_choice']);

export const QuestionOptionSchema = z.object({
  id: z.string().trim().min(1).max(CONTRACT_LIMITS.shortText),
  text: z.string().trim().min(1).max(CONTRACT_LIMITS.mediumText),
});

export const QuestionRecordSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  visibility: QuestionVisibilitySchema,
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  stem: z.string().min(1).max(CONTRACT_LIMITS.longText),
  type: QuestionTypeSchema,
  difficulty: QuestionDifficultySchema,
  // tag 必须非空：空串会流入题库目录 facets（value 要求 min(1)）导致接口 500。
  tags: z.array(z.string().trim().min(1).max(CONTRACT_LIMITS.shortText)).max(CONTRACT_LIMITS.tags),
  answer: z.string().min(1).max(CONTRACT_LIMITS.longText),
  rubric: z.array(RubricPointSchema).max(CONTRACT_LIMITS.list),
  options: z.array(QuestionOptionSchema).max(MAX_QUESTION_OPTIONS).optional(),
  correctOptionIds: z.array(z.string().min(1).max(CONTRACT_LIMITS.shortText)).optional(),
  sourceRefs: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  status: QuestionStatusSchema,
});

export const QuestionSchema = QuestionRecordSchema.superRefine(validateObjectiveQuestion);

export const CandidateQuestionSchema = QuestionRecordSchema.omit({
  answer: true,
  rubric: true,
  correctOptionIds: true,
});

function validateObjectiveQuestion(
  question: z.infer<typeof QuestionRecordSchema>,
  context: z.RefinementCtx,
) {
  const options = question.options ?? [];
  const correctIds = question.correctOptionIds ?? [];
  if (!OBJECTIVE_QUESTION_TYPES.has(question.type)) {
    validateOpenQuestion(options, correctIds, context);
    return;
  }
  const optionIds = options.map((option) => option.id);
  validateOptionIds(optionIds, correctIds, context);
  validateCorrectCount(question.type, correctIds, context);
}

function validateOpenQuestion(
  options: z.infer<typeof QuestionOptionSchema>[],
  correctIds: string[],
  context: z.RefinementCtx,
) {
  if (options.length || correctIds.length)
    addQuestionIssue(context, 'OBJECTIVE_FIELDS_NOT_ALLOWED');
}

function validateOptionIds(optionIds: string[], correctIds: string[], context: z.RefinementCtx) {
  if (optionIds.length < MIN_QUESTION_OPTIONS)
    addQuestionIssue(context, 'QUESTION_OPTIONS_REQUIRED');
  if (new Set(optionIds).size !== optionIds.length)
    addQuestionIssue(context, 'QUESTION_OPTION_IDS_DUPLICATED');
  if (new Set(correctIds).size !== correctIds.length)
    addQuestionIssue(context, 'CORRECT_OPTION_IDS_DUPLICATED');
  if (correctIds.some((id) => !optionIds.includes(id)))
    addQuestionIssue(context, 'CORRECT_OPTION_ID_UNKNOWN');
}

function validateCorrectCount(
  type: z.infer<typeof QuestionTypeSchema>,
  correctIds: string[],
  context: z.RefinementCtx,
) {
  if (type === 'single_choice' && correctIds.length !== 1) {
    addQuestionIssue(context, 'SINGLE_CHOICE_REQUIRES_ONE_ANSWER');
  }
  if (type === 'multiple_choice' && correctIds.length < MIN_QUESTION_OPTIONS) {
    addQuestionIssue(context, 'MULTIPLE_CHOICE_REQUIRES_MULTIPLE_ANSWERS');
  }
}

function addQuestionIssue(context: z.RefinementCtx, message: string) {
  context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message });
}

export const CandidateReviewStatusSchema = z.enum([
  'pending',
  'needs_edit',
  'approved',
  'rejected',
]);
export const CandidateImportSourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
});
export const CandidateReviewSchema = z.object({
  id: z.string().min(1),
  importTaskId: z.string().min(1).nullable(),
  publishedQuestionId: z.string().min(1).nullable().default(null),
  sourceImport: CandidateImportSourceSchema.nullable().default(null),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  status: CandidateReviewStatusSchema,
  qualityScore: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  tags: z.array(z.string().max(CONTRACT_LIMITS.shortText)).max(CONTRACT_LIMITS.tags),
  sourceRefs: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  createdAt: z.string().datetime(),
});

export const BatchCandidateReviewInputSchema = z
  .object({
    candidateIds: z.array(z.string().min(1)).min(1).max(CONTRACT_LIMITS.list),
    status: z.enum(['needs_edit', 'approved', 'rejected']),
    reviewNotes: z.string().max(CONTRACT_LIMITS.mediumText).nullable(),
  })
  .refine((value) => new Set(value.candidateIds).size === value.candidateIds.length, {
    message: 'Candidate IDs must be unique.',
    path: ['candidateIds'],
  });

export const BatchCandidateReviewResultSchema = z.object({
  updatedCount: z.number().int().nonnegative(),
});

export const BatchCandidatePublishInputSchema = z
  .object({
    candidateIds: z.array(z.string().min(1)).min(1).max(CONTRACT_LIMITS.list),
    visibility: QuestionVisibilitySchema.default('tenant'),
  })
  .refine((value) => new Set(value.candidateIds).size === value.candidateIds.length, {
    message: 'Candidate IDs must be unique.',
    path: ['candidateIds'],
  });

export const BatchCandidatePublishResultSchema = z.object({
  publishedCount: z.number().int().nonnegative(),
  alreadyPublishedCount: z.number().int().nonnegative(),
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

export type RubricPoint = z.infer<typeof RubricPointSchema>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type CandidateQuestion = z.infer<typeof CandidateQuestionSchema>;
export type CandidateReview = z.infer<typeof CandidateReviewSchema>;
export type BatchCandidateReviewInput = z.infer<typeof BatchCandidateReviewInputSchema>;
export type BatchCandidateReviewResult = z.infer<typeof BatchCandidateReviewResultSchema>;
export type BatchCandidatePublishInput = z.infer<typeof BatchCandidatePublishInputSchema>;
export type BatchCandidatePublishResult = z.infer<typeof BatchCandidatePublishResultSchema>;
export type TrainingPlan = z.infer<typeof TrainingPlanSchema>;

export const ImportTaskStatusSchema = z.enum([
  'received',
  'processing',
  'review',
  'published',
  'failed',
]);

export const CandidateReviewProgressSchema = z.object({
  pending: z.number().int().nonnegative(),
  needsEdit: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  published: z.number().int().nonnegative(),
});

export const MarkdownImportRequestSchema = z.object({
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  markdown: z.string().min(MIN_MARKDOWN_IMPORT_LENGTH).max(CONTRACT_LIMITS.longText),
});

export const ImportTaskSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  assetId: z.string().min(1),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  status: ImportTaskStatusSchema,
  candidateCount: z.number().int().nonnegative(),
  candidateReviewProgress: CandidateReviewProgressSchema,
  failureReason: z.string().max(CONTRACT_LIMITS.mediumText).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ImportSourceChunkSchema = z.object({
  sequence: z.number().int().positive(),
  content: z.string().min(1).max(CONTRACT_LIMITS.longText),
});

export const ImportReviewContextSchema = z.object({
  task: ImportTaskSchema,
  sourceChunks: z.array(ImportSourceChunkSchema).max(CONTRACT_LIMITS.list),
});

export const CandidateQuestionDetailSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  importTaskId: z.string().min(1).nullable(),
  publishedQuestionId: z.string().min(1).nullable(),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  stem: z.string().min(1).max(CONTRACT_LIMITS.longText),
  type: QuestionTypeSchema,
  difficulty: QuestionDifficultySchema,
  answer: z.string().min(1).max(CONTRACT_LIMITS.longText),
  rubric: z.array(RubricPointSchema).min(1).max(CONTRACT_LIMITS.list),
  status: CandidateReviewStatusSchema,
  qualityScore: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  tags: z.array(z.string().max(CONTRACT_LIMITS.shortText)).max(CONTRACT_LIMITS.tags),
  sourceRefs: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  reviewNotes: z.string().max(CONTRACT_LIMITS.mediumText).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const CandidateEditableFieldsSchema = z.object({
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText).optional(),
  stem: z.string().min(1).max(CONTRACT_LIMITS.longText).optional(),
  type: QuestionTypeSchema.optional(),
  difficulty: QuestionDifficultySchema.optional(),
  answer: z.string().min(1).max(CONTRACT_LIMITS.longText).optional(),
  rubric: z.array(RubricPointSchema).min(1).max(CONTRACT_LIMITS.list).optional(),
  tags: z.array(z.string().max(CONTRACT_LIMITS.shortText)).max(CONTRACT_LIMITS.tags).optional(),
  reviewNotes: z.string().max(CONTRACT_LIMITS.mediumText).nullable().optional(),
  status: CandidateReviewStatusSchema.optional(),
});

export const UpdateCandidateQuestionInputSchema = CandidateEditableFieldsSchema.refine(
  (value) => Object.keys(value).length > 0,
  'At least one candidate field is required.',
);

export const PublishCandidateQuestionInputSchema = z.object({
  visibility: QuestionVisibilitySchema.default('tenant'),
});

export type ImportTask = z.infer<typeof ImportTaskSchema>;
export type CandidateReviewProgress = z.infer<typeof CandidateReviewProgressSchema>;
export type ImportReviewContext = z.infer<typeof ImportReviewContextSchema>;
export type CandidateQuestionDetail = z.infer<typeof CandidateQuestionDetailSchema>;
export type MarkdownImportRequest = z.infer<typeof MarkdownImportRequestSchema>;
export type UpdateCandidateQuestionInput = z.infer<typeof UpdateCandidateQuestionInputSchema>;
export type PublishCandidateQuestionInput = z.infer<typeof PublishCandidateQuestionInputSchema>;
