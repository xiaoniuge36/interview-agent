import type { AdminAgentHeartbeatRunInput, AdminAgentRun } from '@/lib/admin-page-agent-run-api';

const ACTIVE_RUN_STATUSES = ['running', 'waiting_confirmation'] as const;
const MAX_ERROR_SUMMARY_LENGTH = 2_000;

export function shouldPollAdminAgentRun(run: AdminAgentRun | null, localRunId: string | null) {
  return Boolean(
    run &&
    run.id !== localRunId &&
    ACTIVE_RUN_STATUSES.includes(run.status as (typeof ACTIVE_RUN_STATUSES)[number]),
  );
}

export function shouldRefreshAdminAgentRun(
  run: AdminAgentRun | null,
  localRunId: string | null,
  error: string | null,
) {
  return Boolean(error) || shouldPollAdminAgentRun(run, localRunId);
}

export function mergeAdminAgentRunProgress(
  current: AdminAgentHeartbeatRunInput,
  update: Partial<AdminAgentHeartbeatRunInput>,
) {
  return { ...current, ...update };
}

export function resolveAdminAgentRunCompletion(success: boolean, stopRequested: boolean) {
  if (stopRequested) return 'cancelled' as const;
  return success ? ('succeeded' as const) : ('failed' as const);
}

export function sanitizeAdminAgentRunErrorSummary(value: string) {
  return value.slice(0, MAX_ERROR_SUMMARY_LENGTH);
}
