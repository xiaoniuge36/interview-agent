import { describe, expect, it } from 'vitest';
import type { AdminAgentRun } from '@/lib/admin-page-agent-run-api';
import {
  mergeAdminAgentRunProgress,
  resolveAdminAgentRunCompletion,
  sanitizeAdminAgentRunErrorSummary,
  shouldPollAdminAgentRun,
  shouldRefreshAdminAgentRun,
} from './admin-agent-run-recovery-model';

describe('admin agent run recovery model', () => {
  it('polls an active run only when it is not owned by this page', () => {
    const run = runRecord({ status: 'running' });

    expect(shouldPollAdminAgentRun(run, null)).toBe(true);
    expect(shouldPollAdminAgentRun(run, 'run-1')).toBe(false);
    expect(shouldPollAdminAgentRun(runRecord({ status: 'interrupted' }), null)).toBe(false);
  });

  it('refreshes after a transient ledger error even when no run was loaded', () => {
    expect(shouldRefreshAdminAgentRun(null, null, 'Product API 暂时不可用')).toBe(true);
    expect(shouldRefreshAdminAgentRun(null, null, null)).toBe(false);
  });

  it('merges progress without discarding the waiting-confirmation state', () => {
    expect(
      mergeAdminAgentRunProgress(
        { status: 'waiting_confirmation', currentStep: '等待确认', tokenCount: 20 },
        { tokenCount: 42 },
      ),
    ).toEqual({ status: 'waiting_confirmation', currentStep: '等待确认', tokenCount: 42 });
  });

  it('maps stopped, successful, and failed executions to terminal ledger states', () => {
    expect(resolveAdminAgentRunCompletion(true, true)).toBe('cancelled');
    expect(resolveAdminAgentRunCompletion(true, false)).toBe('succeeded');
    expect(resolveAdminAgentRunCompletion(false, false)).toBe('failed');
  });

  it('bounds persisted error summaries to the Product API contract', () => {
    expect(sanitizeAdminAgentRunErrorSummary('x'.repeat(2_001))).toHaveLength(2_000);
  });
});

function runRecord(overrides: Partial<AdminAgentRun> = {}): AdminAgentRun {
  return {
    id: 'run-1',
    conversationId: 'conversation-1',
    retryOfRunId: null,
    prompt: '查询导入任务',
    status: 'running',
    currentStep: null,
    tokenCount: 0,
    traceId: 'trace-1',
    errorCode: null,
    errorSummary: null,
    startedAt: '2026-07-23T08:00:00.000Z',
    finishedAt: null,
    heartbeatAt: '2026-07-23T08:00:00.000Z',
    updatedAt: '2026-07-23T08:00:00.000Z',
    ...overrides,
  };
}
