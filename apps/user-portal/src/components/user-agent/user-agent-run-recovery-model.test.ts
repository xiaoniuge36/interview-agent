import { describe, expect, it } from 'vitest';
import type { UserAgentRun } from '@/lib/user-page-agent-run-api';
import {
  mergeUserAgentRunProgress,
  resolveUserAgentRunCompletion,
  shouldPollUserAgentRun,
  shouldRefreshUserAgentRun,
} from './user-agent-run-recovery-model';

describe('user agent run recovery model', () => {
  it('does not poll terminal recovery runs', () => {
    const interruptedRun = runRecord({ status: 'interrupted' });

    expect(shouldPollUserAgentRun(interruptedRun, null)).toBe(false);
    expect(shouldRefreshUserAgentRun(interruptedRun, null, null)).toBe(false);
  });

  it('polls only a remote active run or after a transport error', () => {
    expect(shouldPollUserAgentRun(runRecord(), null)).toBe(true);
    expect(shouldPollUserAgentRun(runRecord(), 'run-1')).toBe(false);
    expect(shouldRefreshUserAgentRun(null, null, '网络错误')).toBe(true);
  });

  it('keeps run phase when reporting additional progress', () => {
    expect(
      mergeUserAgentRunProgress(
        { status: 'waiting_confirmation', currentStep: '等待确认', tokenCount: 20 },
        { tokenCount: 42 },
      ),
    ).toEqual({ status: 'waiting_confirmation', currentStep: '等待确认', tokenCount: 42 });
  });

  it('maps stopped, successful, and failed work to terminal records', () => {
    expect(resolveUserAgentRunCompletion(true, true)).toBe('cancelled');
    expect(resolveUserAgentRunCompletion(true, false)).toBe('succeeded');
    expect(resolveUserAgentRunCompletion(false, false)).toBe('failed');
  });
});

function runRecord(overrides: Partial<UserAgentRun> = {}): UserAgentRun {
  return {
    id: 'run-1',
    conversationId: 'conversation-1',
    retryOfRunId: null,
    prompt: '给出训练建议',
    status: 'running',
    currentStep: null,
    tokenCount: 0,
    traceId: 'trace-1',
    errorCode: null,
    errorSummary: null,
    startedAt: '2026-07-27T08:00:00.000Z',
    finishedAt: null,
    heartbeatAt: '2026-07-27T08:00:00.000Z',
    updatedAt: '2026-07-27T08:00:00.000Z',
    ...overrides,
  };
}
