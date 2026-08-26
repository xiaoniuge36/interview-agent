import type { PageAgentRun } from '@interview-agent/contracts';
import type { PageAgentHeartbeatRunInput } from './requests';

const ACTIVE_RUN_STATUSES = ['running', 'waiting_confirmation'] as const;

export async function loadCurrentPageAgentRunHistory(
  conversationId: string,
  load: (conversationId: string) => Promise<PageAgentRun[]>,
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

export function shouldPollPageAgentRun(run: PageAgentRun | null, localRunId: string | null) {
  return Boolean(
    run &&
    run.id !== localRunId &&
    ACTIVE_RUN_STATUSES.includes(run.status as (typeof ACTIVE_RUN_STATUSES)[number]),
  );
}

export function shouldRefreshPageAgentRun(
  run: PageAgentRun | null,
  localRunId: string | null,
  error: string | null,
) {
  return Boolean(error) || shouldPollPageAgentRun(run, localRunId);
}

export function mergePageAgentRunProgress(
  current: PageAgentHeartbeatRunInput,
  update: Partial<PageAgentHeartbeatRunInput>,
) {
  return { ...current, ...update };
}

export function resolvePageAgentRunCompletion(success: boolean, stopRequested: boolean) {
  if (stopRequested) return 'cancelled' as const;
  return success ? ('succeeded' as const) : ('failed' as const);
}
