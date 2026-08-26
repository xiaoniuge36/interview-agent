export {
  mergePageAgentRunProgress as mergeAdminAgentRunProgress,
  resolvePageAgentRunCompletion as resolveAdminAgentRunCompletion,
  shouldPollPageAgentRun as shouldPollAdminAgentRun,
  shouldRefreshPageAgentRun as shouldRefreshAdminAgentRun,
} from '@interview-agent/page-agent-client';

const MAX_ERROR_SUMMARY_LENGTH = 2_000;

export function sanitizeAdminAgentRunErrorSummary(value: string) {
  return value.slice(0, MAX_ERROR_SUMMARY_LENGTH);
}
