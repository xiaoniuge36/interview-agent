import type { Dispatch } from 'react';
import { ApiError } from '@interview-agent/api-client';
import type { InterviewSession } from '@interview-agent/contracts';
import type { InterviewAction } from '@/components/interview/interview-state';

export const INTERVIEW_VERSION_CONFLICT_NOTICE = '本场面试已在另一窗口推进，已为你同步到最新进度。';

export function isInterviewVersionConflict(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'INTERVIEW_VERSION_CONFLICT';
}

type ConflictRecoveryContext = {
  loadSession: () => Promise<InterviewSession>;
  dispatch: Dispatch<InterviewAction>;
  connect: (sessionId: string, cursor: number) => void;
  notifySynced: (notice: string) => void;
};

/**
 * 版本冲突意味着另一窗口已推进本场面试：重拉会话把 UI 对齐到最新进度，
 * 而不是把冲突当普通失败抛给用户。重拉也失败时返回 false，走常规失败路径。
 */
export async function recoverInterviewVersionConflict(
  context: ConflictRecoveryContext,
): Promise<boolean> {
  let session: InterviewSession;
  try {
    session = await context.loadSession();
  } catch {
    return false;
  }
  const processing = session.status === 'running' || session.status === 'generating_report';
  context.dispatch({ type: 'session', session });
  context.dispatch({ type: 'busy', busy: processing });
  context.dispatch({ type: 'notice', notice: INTERVIEW_VERSION_CONFLICT_NOTICE });
  if (processing) context.connect(session.id, session.eventSequence);
  context.notifySynced(INTERVIEW_VERSION_CONFLICT_NOTICE);
  return true;
}
