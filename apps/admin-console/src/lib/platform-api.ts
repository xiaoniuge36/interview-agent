import {
  PlatformAiAnalyticsSchema,
  PlatformDashboardSchema,
  type PlatformAiAnalytics,
  type PlatformAiAnalyticsQuery,
  type PlatformDashboard,
  type PlatformDashboardPeriod,
} from '@interview-agent/contracts';
import type { ZodType } from 'zod';
import { adminRequest, type AdminApiRequest } from './api';

export function createPlatformDashboardRequest(
  period: PlatformDashboardPeriod,
  signal?: AbortSignal,
): AdminApiRequest<PlatformDashboard> {
  return {
    path: `/admin/platform/dashboard?period=${period}`,
    schema: PlatformDashboardSchema as unknown as ZodType<PlatformDashboard>,
    ...(signal ? { init: { signal } } : {}),
  };
}

export function getPlatformDashboard(period: PlatformDashboardPeriod, signal?: AbortSignal) {
  return adminRequest(createPlatformDashboardRequest(period, signal));
}

export function createPlatformAiAnalyticsRequest(
  query: PlatformAiAnalyticsQuery,
  signal?: AbortSignal,
): AdminApiRequest<PlatformAiAnalytics> {
  const params = new URLSearchParams({ period: query.period });
  if (query.provider) params.set('provider', query.provider);
  if (query.operation) params.set('operation', query.operation);
  return {
    path: `/admin/platform/ai-analytics?${params.toString()}`,
    schema: PlatformAiAnalyticsSchema as unknown as ZodType<PlatformAiAnalytics>,
    ...(signal ? { init: { signal } } : {}),
  };
}

export function getPlatformAiAnalytics(query: PlatformAiAnalyticsQuery, signal?: AbortSignal) {
  return adminRequest(createPlatformAiAnalyticsRequest(query, signal));
}
