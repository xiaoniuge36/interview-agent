'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import type { InterviewSessionStatus } from '@interview-agent/contracts';
import type { InterviewAction } from '@/components/interview/interview-state';
import { interviewErrorMessage, interviewStatusNotice } from '@/hooks/interview-feedback';
import { getInterview, getInterviewReport } from '@/lib/interview-api';
import { loadInterviewSnapshot } from './interview-snapshot';

type ArchivedInterviewOptions = {
  sessionId: string | null;
  dispatch: Dispatch<InterviewAction>;
  connect: (sessionId: string, cursor: number) => void;
  disconnect: () => void;
  currentSessionId: string | null;
};
type RestoredInterviewTarget = Pick<ArchivedInterviewOptions, 'connect' | 'dispatch'>;

export function useArchivedInterview(options: ArchivedInterviewOptions) {
  const loadedKey = useRef<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [failedSessionId, setFailedSessionId] = useState<string | null>(null);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const { connect, currentSessionId, disconnect, dispatch, sessionId } = options;
  const retry = useCallback(() => {
    setFailedSessionId(null);
    dispatch({ type: 'busy', busy: true });
    setRetryNonce((value) => value + 1);
  }, [dispatch]);
  useEffect(() => {
    if (!sessionId || (sessionId === currentSessionId && retryNonce === 0)) return;
    const requestKey = `${sessionId}:${retryNonce}`;
    if (loadedKey.current === requestKey) return;
    let active = true;
    loadedKey.current = requestKey;
    setFailedSessionId(null);
    setLoadingSessionId(sessionId);
    disconnect();
    dispatch({ type: 'restore_start' });
    void loadArchivedInterview(sessionId).then((result) => {
      if (!active) return;
      setLoadingSessionId(null);
      handleArchivedResult({
        result,
        sessionId,
        target: { connect, dispatch },
        setFailedSessionId,
      });
    });
    return () => {
      active = false;
      if (loadedKey.current === requestKey) loadedKey.current = null;
    };
  }, [connect, currentSessionId, disconnect, dispatch, retryNonce, sessionId]);
  return {
    loadFailed: failedSessionId === sessionId,
    reloading: loadingSessionId === sessionId,
    retry,
  };
}

function loadArchivedInterview(sessionId: string) {
  return loadInterviewSnapshot({
    loadSession: () => getInterview(sessionId),
    loadReport: () => getInterviewReport(sessionId),
  });
}

function handleArchivedResult(input: {
  result: Awaited<ReturnType<typeof loadInterviewSnapshot>>;
  sessionId: string;
  target: RestoredInterviewTarget;
  setFailedSessionId: (sessionId: string) => void;
}) {
  if (input.result.status === 'error') {
    input.setFailedSessionId(input.sessionId);
    input.target.dispatch({ type: 'failure', message: interviewErrorMessage(input.result.error) });
    return;
  }
  applyRestoredInterview(input.target, input.result.session, input.result.report);
  if (input.result.status === 'partial') {
    input.target.dispatch({
      type: 'notice',
      notice: '本轮复盘已生成，报告内容暂时无法读取，请重新加载本轮复盘。',
    });
  }
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

function isProcessing(status: InterviewSessionStatus) {
  return status === 'running' || status === 'generating_report';
}
