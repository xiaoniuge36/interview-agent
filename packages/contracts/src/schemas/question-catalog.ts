import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';
import { PracticeModeSchema, PracticeSessionStatusSchema } from './practice';
import { CandidateQuestionSchema, QuestionDifficultySchema, QuestionTypeSchema } from './training';

const CATALOG_PAGE_SIZE_MAX = 50;
const CATALOG_PAGE_SIZE_DEFAULT = 20;
const RECOMMENDATION_LIMIT = 6;
const RECOMMENDATION_QUESTION_LIMIT = 10;
const RECOMMENDATION_EVIDENCE_LIMIT = 4;

export const QuestionCatalogCategorySchema = z.enum([
  'engineering',
  'data',
  'ai_agent',
  'product_design',
  'growth_operations',
  'business_delivery',
  'generic',
]);
export const QuestionCatalogSortSchema = z.enum(['recommended', 'updated', 'difficulty']);

const StringListSchema = z.preprocess(
  (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return undefined;
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  },
  z.array(z.string().min(1).max(CONTRACT_LIMITS.shortText)).max(CONTRACT_LIMITS.tags).optional(),
);

export const QuestionCatalogQuerySchema = z.object({
  query: z.string().trim().max(CONTRACT_LIMITS.shortText).optional(),
  category: QuestionCatalogCategorySchema.optional(),
  tags: StringListSchema,
  company: z.string().trim().min(1).max(CONTRACT_LIMITS.shortText).optional(),
  type: QuestionTypeSchema.optional(),
  difficulty: QuestionDifficultySchema.optional(),
  sort: QuestionCatalogSortSchema.default('recommended'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(CATALOG_PAGE_SIZE_MAX)
    .default(CATALOG_PAGE_SIZE_DEFAULT),
});

/** 目录条目在共享题目结构上追加公司归属（来自 company: 前缀标签，普通 tags 中不再出现）。 */
export const QuestionCatalogItemSchema = CandidateQuestionSchema.extend({
  companies: z
    .array(z.string().min(1).max(CONTRACT_LIMITS.shortText))
    .max(CONTRACT_LIMITS.tags)
    .default([]),
});
export const QuestionCatalogFacetSchema = z.object({
  value: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  label: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  count: z.number().int().nonnegative(),
});
export const QuestionCatalogFacetsSchema = z.object({
  categories: z.array(QuestionCatalogFacetSchema).max(CONTRACT_LIMITS.list),
  difficulties: z.array(QuestionCatalogFacetSchema).max(CONTRACT_LIMITS.list),
  types: z.array(QuestionCatalogFacetSchema).max(CONTRACT_LIMITS.list),
  tags: z.array(QuestionCatalogFacetSchema).max(CONTRACT_LIMITS.mediumList),
  companies: z.array(QuestionCatalogFacetSchema).max(CONTRACT_LIMITS.mediumList).default([]),
});
export const QuestionCatalogResponseSchema = z.object({
  items: z.array(QuestionCatalogItemSchema).max(CATALOG_PAGE_SIZE_MAX),
  facets: QuestionCatalogFacetsSchema,
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(CATALOG_PAGE_SIZE_MAX),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const PracticeRecommendationSourceSchema = z.enum(['profile', 'job', 'mastery', 'curated']);
export const PracticeRecommendationEvidenceTypeSchema = z.enum([
  'mastery',
  'practice',
  'job',
  'profile',
  'curated',
  'retrieval',
]);
export const PracticeRecommendationAlgorithmSchema = z.enum(['rules', 'hybrid']);
export const PracticeRecommendationEvidenceSchema = z.object({
  type: PracticeRecommendationEvidenceTypeSchema,
  sourceId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  label: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  detail: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
});
export const PracticeRecommendationSchema = z.object({
  id: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  reason: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  source: PracticeRecommendationSourceSchema,
  algorithm: PracticeRecommendationAlgorithmSchema.default('rules'),
  category: QuestionCatalogCategorySchema.nullable(),
  estimatedMinutes: z.number().int().positive(),
  questionIds: z.array(z.string().min(1)).min(1).max(RECOMMENDATION_QUESTION_LIMIT),
  evidence: z
    .array(PracticeRecommendationEvidenceSchema)
    .max(RECOMMENDATION_EVIDENCE_LIMIT)
    .optional(),
});
export const PracticeRecommendationListSchema = z
  .array(PracticeRecommendationSchema)
  .max(RECOMMENDATION_LIMIT);

export const RecentPracticeSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  mode: PracticeModeSchema,
  status: PracticeSessionStatusSchema,
  questionCount: z.number().int().positive(),
  answeredCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});
export const RecentPracticeResponseSchema = RecentPracticeSummarySchema.nullable();

export type QuestionCatalogCategory = z.infer<typeof QuestionCatalogCategorySchema>;
export type QuestionCatalogQuery = z.infer<typeof QuestionCatalogQuerySchema>;
export type QuestionCatalogResponse = z.infer<typeof QuestionCatalogResponseSchema>;
export type PracticeRecommendation = z.infer<typeof PracticeRecommendationSchema>;
export type PracticeRecommendationEvidence = z.infer<typeof PracticeRecommendationEvidenceSchema>;
export type RecentPracticeSummary = z.infer<typeof RecentPracticeSummarySchema>;
