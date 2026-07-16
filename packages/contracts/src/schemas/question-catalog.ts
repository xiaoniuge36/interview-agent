import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';
import { PracticeModeSchema, PracticeSessionStatusSchema } from './practice';
import { QuestionSchema, QuestionDifficultySchema, QuestionTypeSchema } from './training';

const CATALOG_PAGE_SIZE_MAX = 50;
const CATALOG_PAGE_SIZE_DEFAULT = 20;
const RECOMMENDATION_LIMIT = 6;
const RECOMMENDATION_QUESTION_LIMIT = 10;

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

export const QuestionCatalogItemSchema = QuestionSchema.omit({ answer: true, rubric: true });
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
});
export const QuestionCatalogResponseSchema = z.object({
  items: z.array(QuestionCatalogItemSchema).max(CATALOG_PAGE_SIZE_MAX),
  facets: QuestionCatalogFacetsSchema,
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(CATALOG_PAGE_SIZE_MAX),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const PracticeRecommendationSourceSchema = z.enum([
  'profile',
  'job',
  'mastery',
  'curated',
]);
export const PracticeRecommendationSchema = z.object({
  id: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  reason: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  source: PracticeRecommendationSourceSchema,
  category: QuestionCatalogCategorySchema.nullable(),
  estimatedMinutes: z.number().int().positive(),
  questionIds: z.array(z.string().min(1)).min(1).max(RECOMMENDATION_QUESTION_LIMIT),
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
export type RecentPracticeSummary = z.infer<typeof RecentPracticeSummarySchema>;
