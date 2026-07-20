import {
  AiUsageSummarySchema,
  type AiUsagePeriod,
  type AiUsageSummary,
} from '@interview-agent/contracts';
import { apiRequest } from './api';

export function aiUsageSummaryPath(period: AiUsagePeriod): string {
  return `/ai-usage/summary?period=${period}`;
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
