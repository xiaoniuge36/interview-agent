import type { UserAgentHeartbeatRunInput, UserAgentRun } from '@/lib/user-page-agent-run-api';

const ACTIVE_RUN_STATUSES = ['running', 'waiting_confirmation'] as const;

export async function loadCurrentUserAgentRunHistory(
  conversationId: string,
  load: (conversationId: string) => Promise<UserAgentRun[]>,
  isCurrent: (conversationId: string) => boolean,
) {
  try {
    const runs = await load(conversationId);
    return isCurrent(conversationId) ? runs : null;
  } catch (error) {
    if (!isCurrent(conversationId)) return null;
    throw error;
  }
}

export function shouldPollUserAgentRun(run: UserAgentRun | null, localRunId: string | null) {
  return Boolean(
    run &&
    run.id !== localRunId &&
    ACTIVE_RUN_STATUSES.includes(run.status as (typeof ACTIVE_RUN_STATUSES)[number]),
  );
}

export function shouldRefreshUserAgentRun(
  run: UserAgentRun | null,
  localRunId: string | null,
  error: string | null,
) {
  return Boolean(error) || shouldPollUserAgentRun(run, localRunId);
}

export function mergeUserAgentRunProgress(
  current: UserAgentHeartbeatRunInput,
  update: Partial<UserAgentHeartbeatRunInput>,
) {
  return { ...current, ...update };
}

export function resolveUserAgentRunCompletion(success: boolean, stopRequested: boolean) {
  if (stopRequested) return 'cancelled' as const;
  return success ? ('succeeded' as const) : ('failed' as const);
}
