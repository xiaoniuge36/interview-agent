import {
  AiInvocationPageSchema,
  AiUsageSummarySchema,
  type AiInvocationPage,
  type AiInvocationPageQuery,
  type AiUsagePeriod,
  type AiUsageSummary,
} from '@interview-agent/contracts';
import { apiRequest } from './api';

export function aiUsageSummaryPath(period: AiUsagePeriod): string {
  return `/ai-usage/summary?period=${period}`;
}

export function aiUsageInvocationsPath(query: AiInvocationPageQuery): string {
  const params = new URLSearchParams({
    period: query.period,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  return `/ai-usage/invocations?${params.toString()}`;
}

export function getAiUsageSummary(
  period: AiUsagePeriod,
  signal?: AbortSignal,
): Promise<AiUsageSummary> {
  return apiRequest({
    path: aiUsageSummaryPath(period),
    schema: AiUsageSummarySchema,
    ...(signal ? { init: { signal } } : {}),
  });
}

export function getAiUsageInvocations(
  query: AiInvocationPageQuery,
  signal?: AbortSignal,
): Promise<AiInvocationPage> {
  return apiRequest({
    path: aiUsageInvocationsPath(query),
    schema: AiInvocationPageSchema,
    ...(signal ? { init: { signal } } : {}),
  });
}
