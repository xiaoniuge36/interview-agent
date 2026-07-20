import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';
import { ModelProviderSchema } from './model-credential';

const UsageCountSchema = z.number().int().nonnegative();
const TokenCountSchema = UsageCountSchema.nullable();
const PercentageSchema = z.number().min(0).max(CONTRACT_LIMITS.percentage);
const LatencySchema = UsageCountSchema.nullable();
const MODEL_BREAKDOWN_MAX = 20;
const RECENT_INVOCATION_MAX = 10;
const OPERATION_BREAKDOWN_MAX = 4;
const FAILURE_BREAKDOWN_MAX = 10;
const TREND_POINT_MAX = 30;

export const AiUsagePeriodSchema = z.enum(['today', '7d', '30d']).default('7d');
export const AiInvocationOperationSchema = z.enum([
  'model_connection_test',
  'practice_evaluation',
  'interview_next',
  'admin_page_agent',
  'user_page_agent',
]);
export const AiInvocationStatusSchema = z.enum(['succeeded', 'failed', 'cancelled']);

export const AiUsageSummaryQuerySchema = z.object({
  period: AiUsagePeriodSchema,
});

const AiUsageRangeSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export const AiUsageTotalsSchema = z.object({
  invocations: UsageCountSchema,
  succeeded: UsageCountSchema,
  failed: UsageCountSchema,
  cancelled: UsageCountSchema,
  successRate: PercentageSchema,
  averageLatencyMs: UsageCountSchema,
  totalTokens: TokenCountSchema,
  usageAvailable: z.boolean(),
});

export const AiUsageModelBreakdownSchema = z.object({
  provider: ModelProviderSchema,
  model: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  invocations: UsageCountSchema,
  succeeded: UsageCountSchema,
  failed: UsageCountSchema,
  cancelled: UsageCountSchema,
  totalTokens: TokenCountSchema,
});

export const AiInvocationViewSchema = z.object({
  id: z.string().min(1),
  operation: AiInvocationOperationSchema,
  provider: ModelProviderSchema,
  model: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  status: AiInvocationStatusSchema,
  latencyMs: LatencySchema,
  totalTokens: TokenCountSchema,
  errorCode: z.string().min(1).max(CONTRACT_LIMITS.errorCode).nullable(),
  createdAt: z.string().datetime(),
});

export const AiUsageSummarySchema = z.object({
  period: AiUsagePeriodSchema,
  range: AiUsageRangeSchema,
  totals: AiUsageTotalsSchema,
  byModel: z.array(AiUsageModelBreakdownSchema).max(MODEL_BREAKDOWN_MAX),
  recent: z.array(AiInvocationViewSchema).max(RECENT_INVOCATION_MAX),
});

const ProviderFilterSchema = z.string().trim().pipe(ModelProviderSchema);

export const PlatformAiAnalyticsQuerySchema = AiUsageSummaryQuerySchema.extend({
  provider: ProviderFilterSchema.optional(),
  operation: AiInvocationOperationSchema.optional(),
});

export const AiUsageOperationBreakdownSchema = z.object({
  operation: AiInvocationOperationSchema,
  invocations: UsageCountSchema,
  succeeded: UsageCountSchema,
  failed: UsageCountSchema,
  cancelled: UsageCountSchema,
  averageLatencyMs: UsageCountSchema,
  totalTokens: TokenCountSchema,
});

export const AiUsageFailureBreakdownSchema = z.object({
  errorCode: z.string().min(1).max(CONTRACT_LIMITS.errorCode),
  count: UsageCountSchema,
});

export const AiUsageTrendPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  invocations: UsageCountSchema,
  succeeded: UsageCountSchema,
  failed: UsageCountSchema,
  cancelled: UsageCountSchema,
  totalTokens: TokenCountSchema,
});

export const PlatformAiAnalyticsSchema = AiUsageSummarySchema.extend({
  filters: z.object({
    provider: ModelProviderSchema.nullable(),
    operation: AiInvocationOperationSchema.nullable(),
  }),
  byOperation: z.array(AiUsageOperationBreakdownSchema).max(OPERATION_BREAKDOWN_MAX),
  failures: z.array(AiUsageFailureBreakdownSchema).max(FAILURE_BREAKDOWN_MAX),
  recentFailures: z.array(AiInvocationViewSchema).max(RECENT_INVOCATION_MAX),
  trend: z.array(AiUsageTrendPointSchema).min(1).max(TREND_POINT_MAX),
});

export type AiUsagePeriod = z.infer<typeof AiUsagePeriodSchema>;
export type AiInvocationOperation = z.infer<typeof AiInvocationOperationSchema>;
export type AiInvocationStatus = z.infer<typeof AiInvocationStatusSchema>;
export type AiUsageSummaryQuery = z.infer<typeof AiUsageSummaryQuerySchema>;
export type AiUsageTotals = z.infer<typeof AiUsageTotalsSchema>;
export type AiUsageModelBreakdown = z.infer<typeof AiUsageModelBreakdownSchema>;
export type AiInvocationView = z.infer<typeof AiInvocationViewSchema>;
export type AiUsageSummary = z.infer<typeof AiUsageSummarySchema>;
export type PlatformAiAnalyticsQuery = z.infer<typeof PlatformAiAnalyticsQuerySchema>;
export type AiUsageOperationBreakdown = z.infer<typeof AiUsageOperationBreakdownSchema>;
export type AiUsageFailureBreakdown = z.infer<typeof AiUsageFailureBreakdownSchema>;
export type AiUsageTrendPoint = z.infer<typeof AiUsageTrendPointSchema>;
export type PlatformAiAnalytics = z.infer<typeof PlatformAiAnalyticsSchema>;
