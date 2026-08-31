import { describe, expect, it } from 'vitest';
import { ApiError } from '@interview-agent/api-client';
import type { InterviewSession } from '@interview-agent/contracts';
import type { InterviewAction } from '@/components/interview/interview-state';
import {
  INTERVIEW_VERSION_CONFLICT_NOTICE,
  isInterviewVersionConflict,
  recoverInterviewVersionConflict,
} from './interview-version-conflict';

describe('isInterviewVersionConflict', () => {
  it('matches only the version conflict error code', () => {
    expect(
      isInterviewVersionConflict(
        new ApiError({ code: 'INTERVIEW_VERSION_CONFLICT', message: '版本冲突' }),
      ),
    ).toBe(true);
    expect(
      isInterviewVersionConflict(
        new ApiError({ code: 'INTERVIEW_COMMAND_NOT_ALLOWED', message: '不允许' }),
      ),
    ).toBe(false);
    expect(isInterviewVersionConflict(new Error('INTERVIEW_VERSION_CONFLICT'))).toBe(false);
  });
});

describe('recoverInterviewVersionConflict', () => {
  it('syncs the latest session and tells the user another window advanced it', async () => {
    const dispatched: InterviewAction[] = [];
    const connected: Array<[string, number]> = [];
    let syncedNotice: string | null = null;

    const recovered = await recoverInterviewVersionConflict({
      loadSession: () => Promise.resolve(session('waiting_user')),
      dispatch: (action) => dispatched.push(action),
      connect: (sessionId, cursor) => connected.push([sessionId, cursor]),
      notifySynced: (notice) => {
        syncedNotice = notice;
      },
    });

    expect(recovered).toBe(true);
    expect(dispatched).toContainEqual({ type: 'session', session: session('waiting_user') });
    expect(dispatched).toContainEqual({ type: 'busy', busy: false });
    expect(dispatched).toContainEqual({
      type: 'notice',
      notice: INTERVIEW_VERSION_CONFLICT_NOTICE,
    });
    expect(connected).toEqual([]);
    expect(syncedNotice).toBe(INTERVIEW_VERSION_CONFLICT_NOTICE);
  });

  it('reconnects the event stream when the other window left processing in flight', async () => {
    const connected: Array<[string, number]> = [];

    const recovered = await recoverInterviewVersionConflict({
      loadSession: () => Promise.resolve(session('generating_report')),
      dispatch: () => undefined,
      connect: (sessionId, cursor) => connected.push([sessionId, cursor]),
      notifySynced: () => undefined,
    });

    expect(recovered).toBe(true);
    expect(connected).toEqual([['session-1', 7]]);
  });

  it('falls back to the regular failure path when the session reload also fails', async () => {
    const dispatched: InterviewAction[] = [];

    const recovered = await recoverInterviewVersionConflict({
      loadSession: () => Promise.reject(new Error('network down')),
      dispatch: (action) => dispatched.push(action),
      connect: () => undefined,
      notifySynced: () => undefined,
    });

    expect(recovered).toBe(false);
    expect(dispatched).toEqual([]);
  });
});

function session(status: InterviewSession['status']): InterviewSession {
  return {
    id: 'session-1',
    status,
    eventSequence: 7,
    turns: [],
  } as never;
}
