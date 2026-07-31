import { describe, expect, it } from 'vitest';
import type { UserAgentRun } from '@/lib/user-page-agent-run-api';
import {
  loadCurrentUserAgentRunHistory,
  mergeUserAgentRunProgress,
  resolveUserAgentRunCompletion,
  shouldPollUserAgentRun,
  shouldRefreshUserAgentRun,
} from './user-agent-run-recovery-model';

function createDeferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, reject, resolve };
}

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
});

describe('user agent remote history scope', () => {
  it('discards remote history when its conversation changes before the response arrives', async () => {
    const pending = createDeferred<UserAgentRun[]>();
    let currentConversationId = 'conversation-1';
    const history = loadCurrentUserAgentRunHistory(
      'conversation-1',
      async () => pending.promise,
      (sourceConversationId) => sourceConversationId === currentConversationId,
    );

    currentConversationId = 'conversation-2';
    pending.resolve([runRecord()]);

    await expect(history).resolves.toBeNull();
  });

  it('returns remote history while its conversation is still current', async () => {
    const runs = [runRecord()];

    await expect(
      loadCurrentUserAgentRunHistory(
        'conversation-1',
        async () => runs,
        () => true,
      ),
    ).resolves.toEqual(runs);
  });

  it('suppresses a stale transport error after switching conversations', async () => {
    const pending = createDeferred<UserAgentRun[]>();
    let currentConversationId = 'conversation-1';
    const history = loadCurrentUserAgentRunHistory(
      'conversation-1',
      async () => pending.promise,
      (sourceConversationId) => sourceConversationId === currentConversationId,
    );

    currentConversationId = 'conversation-2';
    pending.reject(new Error('old conversation failed'));

    await expect(history).resolves.toBeNull();
  });
});

describe('user agent run progress model', () => {
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
