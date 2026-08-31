import { describe, expect, it } from 'vitest';
import { shouldGuardInterviewLeave } from './useInterviewLeaveGuard';

describe('shouldGuardInterviewLeave', () => {
  it('guards while waiting for an answer or while the AI is processing', () => {
    expect(shouldGuardInterviewLeave({ status: 'waiting_user' }, false)).toBe(true);
    expect(shouldGuardInterviewLeave({ status: 'running' }, true)).toBe(true);
    expect(shouldGuardInterviewLeave({ status: 'generating_report' }, true)).toBe(true);
    expect(shouldGuardInterviewLeave(null, true)).toBe(true);
  });

  it('stays silent when nothing is in flight or the round is over', () => {
    expect(shouldGuardInterviewLeave(null, false)).toBe(false);
    expect(shouldGuardInterviewLeave({ status: 'report_ready' }, false)).toBe(false);
    expect(shouldGuardInterviewLeave({ status: 'failed' }, false)).toBe(false);
    expect(shouldGuardInterviewLeave({ status: 'cancelled' }, false)).toBe(false);
  });
});
