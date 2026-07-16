import {
  PlatformDashboardSchema,
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
