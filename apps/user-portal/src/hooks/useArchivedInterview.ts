'use client';

import { useEffect, useRef, type Dispatch } from 'react';
import type { InterviewSessionStatus } from '@interview-agent/contracts';
import type { InterviewAction } from '@/components/interview/interview-state';
import { interviewErrorMessage, interviewStatusNotice } from '@/hooks/interview-feedback';
import { getInterview, getInterviewReport } from '@/lib/interview-api';

type ArchivedInterviewOptions = {
  sessionId: string | null;
  dispatch: Dispatch<InterviewAction>;
  connect: (sessionId: string, cursor: number) => void;
  disconnect: () => void;
};
type RestoredInterviewTarget = Pick<ArchivedInterviewOptions, 'connect' | 'dispatch'>;

export function useArchivedInterview(options: ArchivedInterviewOptions) {
  const loadedId = useRef<string | null>(null);
  const { connect, disconnect, dispatch, sessionId } = options;
  useEffect(() => {
    if (!sessionId || loadedId.current === sessionId) return;
    let active = true;
    loadedId.current = sessionId;
    disconnect();
    dispatch({ type: 'reset' });
    void restoreInterview(sessionId).then((result) => {
      if (!active) return;
      if ('error' in result) {
        dispatch({ type: 'failure', message: result.error });
        return;
      }
      applyRestoredInterview({ connect, dispatch }, result.session, result.report);
    });
    return () => {
      active = false;
    };
  }, [connect, disconnect, dispatch, sessionId]);
}

function applyRestoredInterview(
  target: RestoredInterviewTarget,
  session: Awaited<ReturnType<typeof getInterview>>,
  report: Awaited<ReturnType<typeof getInterviewReport>> | null,
) {
  target.dispatch({ type: 'session', session });
  target.dispatch({ type: 'busy', busy: isProcessing(session.status) });
  target.dispatch({ type: 'notice', notice: interviewStatusNotice(session.status) });
  if (report) target.dispatch({ type: 'report', report });
  if (isProcessing(session.status)) target.connect(session.id, session.eventSequence);
}

async function restoreInterview(sessionId: string) {
  try {
    const session = await getInterview(sessionId);
    const report = session.status === 'report_ready' ? await getInterviewReport(sessionId) : null;
    return { session, report };
  } catch (error) {
    return { error: interviewErrorMessage(error) };
  }
}

function isProcessing(status: InterviewSessionStatus) {
  return status === 'running' || status === 'generating_report';
}
