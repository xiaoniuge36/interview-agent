import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';
import { PaginationMetaSchema } from './api';
import { CandidateQuestionSchema, RubricPointSchema } from './training';

export const PracticeSessionStatusSchema = z.enum([
  'created',
  'in_progress',
  'submitted',
  'report_ready',
  'cancelled',
]);
export const PracticeItemStatusSchema = z.enum(['pending', 'answered', 'evaluated']);
export const PracticeModeSchema = z.enum([
  'smart',
  'manual',
  'weakness_review',
  'interview_review',
]);

const MAX_PRACTICE_QUESTIONS = 10;
const MAX_PRACTICE_REPORT_EVIDENCE = 6;
const MAX_PRACTICE_HISTORY_ITEMS = 200;
const DEFAULT_MISTAKE_PAGE = 1;
const DEFAULT_MISTAKE_PAGE_SIZE = 20;
const MAX_MISTAKE_PAGE_SIZE = 100;

export const CreatePracticeSessionSchema = z
  .object({
    title: z.string().min(1).max(CONTRACT_LIMITS.shortText).optional(),
    mode: PracticeModeSchema.optional(),
    jobIntentId: z.string().min(1).optional(),
    questionIds: z.array(z.string().min(1)).min(1).max(MAX_PRACTICE_QUESTIONS).optional(),
    sourceInterviewSessionId: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (value.mode === 'interview_review' && !value.sourceInterviewSessionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceInterviewSessionId'],
        message: 'INTERVIEW_REVIEW_SOURCE_REQUIRED',
      });
    }
    if (value.mode !== 'interview_review' && value.sourceInterviewSessionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mode'],
        message: 'INTERVIEW_REVIEW_SOURCE_NOT_ALLOWED',
      });
    }
    if (value.mode === 'interview_review' && value.questionIds) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['questionIds'],
        message: 'INTERVIEW_REVIEW_QUESTION_IDS_NOT_ALLOWED',
      });
    }
  });

export const SubmitPracticeAnswerSchema = z.object({
  answer: z.string().min(1).max(CONTRACT_LIMITS.longText),
});

export const PracticeEvaluationSchema = z.object({
  id: z.string().min(1),
  sessionItemId: z.string().min(1),
  score: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  feedback: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  missingPoints: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  rubricScores: z
    .array(
      z.object({
        point: z.string().min(1).max(CONTRACT_LIMITS.shortText),
        score: z.number().min(0).max(CONTRACT_LIMITS.percentage),
      }),
    )
    .max(CONTRACT_LIMITS.list),
  followUpQuestion: z.string().min(1).max(CONTRACT_LIMITS.mediumText).nullable().default(null),
  createdAt: z.string().datetime(),
});

export const PracticeItemSolutionSchema = z.object({
  referenceAnswer: z.string().min(1).max(CONTRACT_LIMITS.longText),
  rubric: z.array(RubricPointSchema).min(1).max(CONTRACT_LIMITS.list),
});
export const PracticeItemFeedbackSchema = PracticeItemSolutionSchema.extend({
  evaluation: PracticeEvaluationSchema,
});

export const PracticeQuestionSchema = CandidateQuestionSchema;

export const PracticeSessionItemSchema = z.object({
  id: z.string().min(1),
  sequence: z.number().int().positive(),
  status: PracticeItemStatusSchema,
  answer: z.string().nullable(),
  answeredAt: z.string().datetime().nullable(),
  question: PracticeQuestionSchema,
  evaluation: PracticeEvaluationSchema.nullable(),
});

export const PracticeSessionSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  jobIntentId: z.string().nullable(),
  sourceInterviewSessionId: z.string().nullable(),
  mode: PracticeModeSchema,
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  status: PracticeSessionStatusSchema,
  startedAt: z.string().datetime(),
  submittedAt: z.string().datetime().nullable(),
  reportedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z.array(PracticeSessionItemSchema).min(1).max(MAX_PRACTICE_QUESTIONS),
});

export const PracticeReportSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  overallScore: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  summary: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  strengths: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  weaknesses: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  nextActions: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  reportMarkdown: z.string().min(1).max(CONTRACT_LIMITS.longText),
  evidence: z
    .array(z.object({ sourceId: z.string().min(1).max(CONTRACT_LIMITS.shortText) }))
    .max(MAX_PRACTICE_REPORT_EVIDENCE)
    .optional(),
  fallbackUsed: z.boolean().optional(),
  itemEvaluations: z.array(PracticeEvaluationSchema).max(MAX_PRACTICE_QUESTIONS),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PracticeHistoryItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  mode: PracticeModeSchema,
  status: PracticeSessionStatusSchema,
  questionCount: z.number().int().positive(),
  answeredCount: z.number().int().nonnegative(),
  evaluatedCount: z.number().int().nonnegative(),
  overallScore: z.number().min(0).max(CONTRACT_LIMITS.percentage).nullable(),
  weaknesses: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  reportedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});

export const PracticeHistoryListSchema = z
  .array(PracticeHistoryItemSchema)
  .max(MAX_PRACTICE_HISTORY_ITEMS);

export const MistakeBookQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(DEFAULT_MISTAKE_PAGE),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_MISTAKE_PAGE_SIZE)
    .default(DEFAULT_MISTAKE_PAGE_SIZE),
});

export const MistakeQuestionSnapshotSchema = CandidateQuestionSchema.pick({
  id: true,
  title: true,
  stem: true,
  type: true,
  difficulty: true,
  tags: true,
  options: true,
});

export const MistakeEvidenceSchema = z.object({
  tag: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  evidence: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  observedScore: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  createdAt: z.string().datetime(),
});

export const MistakeBookItemSchema = z.object({
  id: z.string().min(1),
  practiceItemId: z.string().min(1),
  questionSnapshot: MistakeQuestionSnapshotSchema,
  score: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  feedback: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  missingPoints: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  evidence: z.array(MistakeEvidenceSchema).max(CONTRACT_LIMITS.tags),
  evaluatedAt: z.string().datetime(),
  reviewedAt: z.string().datetime().nullable(),
  canStartReview: z.boolean(),
});

export const MistakeBookSchema = PaginationMetaSchema.extend({
  items: z.array(MistakeBookItemSchema),
});

export const MasteryProfileSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  tag: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  score: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  evidenceCount: z.number().int().nonnegative(),
  lastEvidenceSessionId: z.string().min(1).nullable(),
  updatedAt: z.string().datetime(),
});

export const MasteryProfileListSchema = z
  .array(MasteryProfileSchema)
  .max(CONTRACT_LIMITS.mediumList);

export const EvaluatorRubricSchema = z.array(RubricPointSchema).min(1).max(CONTRACT_LIMITS.list);

export type CreatePracticeSession = z.infer<typeof CreatePracticeSessionSchema>;
export type SubmitPracticeAnswer = z.infer<typeof SubmitPracticeAnswerSchema>;
export type PracticeSession = z.infer<typeof PracticeSessionSchema>;
export type PracticeSessionItem = z.infer<typeof PracticeSessionItemSchema>;
export type PracticeEvaluation = z.infer<typeof PracticeEvaluationSchema>;
export type PracticeItemSolution = z.infer<typeof PracticeItemSolutionSchema>;
export type PracticeItemFeedback = z.infer<typeof PracticeItemFeedbackSchema>;
export type PracticeReport = z.infer<typeof PracticeReportSchema>;
export type PracticeHistoryItem = z.infer<typeof PracticeHistoryItemSchema>;
export type MistakeBookQuery = z.infer<typeof MistakeBookQuerySchema>;
export type MistakeQuestionSnapshot = z.infer<typeof MistakeQuestionSnapshotSchema>;
export type MistakeEvidence = z.infer<typeof MistakeEvidenceSchema>;
export type MistakeBookItem = z.infer<typeof MistakeBookItemSchema>;
export type MistakeBook = z.infer<typeof MistakeBookSchema>;
export type MasteryProfile = z.infer<typeof MasteryProfileSchema>;
