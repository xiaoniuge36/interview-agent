'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, type Dispatch } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AgentStreamEvent, JobIntentPayload } from '@interview-agent/contracts';
import {
  INITIAL_INTERVIEW_STATE,
  interviewReducer,
  type InterviewAction,
} from '@/components/interview/interview-state';
import { getInterview, getInterviewReport } from '@/lib/interview-api';
import { interviewPlanForJob } from '@/lib/interview-roles';
import { subscribeInterviewEvents } from '@/lib/interview-stream';
import {
  useNotifications,
  type NotificationApi,
} from '@/components/notifications/NotificationProvider';
import {
  interviewErrorMessage,
  interviewRetryNotice,
  interviewStatusLabel,
} from './interview-feedback';
import { useArchivedInterview } from './useArchivedInterview';
import { applyInterviewCommandResult, useInterviewActions } from './useInterviewActions';
import { useInterviewDraft } from './useInterviewDraft';
import { useSelectedInterviewJob, useSelectedJob } from './useInterviewSelection';
import { loadInterviewSnapshot } from './interview-snapshot';

export function useInterviewController(jobs: JobIntentPayload[]) {
  const notifications = useNotifications();
  const [state, dispatch] = useReducer(interviewReducer, INITIAL_INTERVIEW_STATE);
  const searchParams = useSearchParams();
  const restoredSessionId = searchParams.get('session');
  const [selectedJobId, setSelectedJobId] = useSelectedJob(jobs, searchParams.get('job'));
  const [connect, disconnect] = useInterviewStream(dispatch, notifications);
  const archiveOptions = { sessionId: restoredSessionId, dispatch, connect, disconnect };
  const archivedRestore = useArchivedInterview(archiveOptions);
  const draftSessionId = state.session?.id ?? restoredSessionId;
  const { clearDraft, draftRecovered, setDraft } = useInterviewDraft({
    sessionId: draftSessionId,
    draft: state.draft,
    dispatch,
    notifications,
  });
  const selectedJob = useSelectedInterviewJob(jobs, selectedJobId);
  const interviewPlan = useMemo(() => interviewPlanForJob(selectedJob), [selectedJob]);
  const { start, submitAnswer } = useInterviewActions({
    selectedJobId: selectedJob?.intent.id ?? '',
    interviewPlan,
    session: state.session,
    draft: state.draft,
    dispatch,
    connect,
    disconnect,
    notifications,
    clearDraft,
  });
  const turns = state.session?.turns ?? [];
  const canAnswer = state.session?.status === 'waiting_user' && !state.busy;
  return {
    state,
    restoredSessionId,
    archivedLoadFailed: archivedRestore.loadFailed,
    reloadArchivedInterview: archivedRestore.retry,
    selectedJobId,
    setSelectedJobId,
    draftRecovered,
    setDraft,
    start,
    submitAnswer,
    turns,
    canAnswer,
    interviewPlan,
    statusLabel: interviewStatusLabel(state.session),
  };
}

function useInterviewStream(dispatch: Dispatch<InterviewAction>, notifications: NotificationApi) {
  const cancelRef = useRef<(() => void) | null>(null);
  const disconnect = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);
  const connect = useCallback(
    (sessionId: string, cursor: number) => {
      disconnect();
      cancelRef.current = subscribeInterviewEvents({
        sessionId,
        afterSequence: cursor,
        onEvent: (event) => handleStreamEvent(dispatch, event, notifications),
        onRetry: (retry) => dispatch({ type: 'notice', notice: interviewRetryNotice(retry) }),
        onTerminalError: (error) => {
          dispatch({ type: 'failure', message: interviewErrorMessage(error) });
          notifications.error('面试实时连接中断', error, '面试连接暂时无法恢复，请稍后重试。');
        },
      });
    },
    [disconnect, dispatch, notifications],
  );
  useEffect(() => disconnect, [disconnect]);
  return [connect, disconnect] as const;
}

function handleStreamEvent(
  dispatch: Dispatch<InterviewAction>,
  event: AgentStreamEvent,
  notifications: NotificationApi,
) {
  dispatch({ type: 'event', event });
  switch (event.type) {
    case 'token':
      return;
    case 'turn_completed':
      void synchronizeSession(dispatch, event.sessionId);
      return;
    case 'report_ready':
      void synchronizeReport(dispatch, event.sessionId, notifications);
      return;
    case 'error':
      dispatch({ type: 'failure', message: interviewErrorMessage(new Error(event.message)) });
      notifications.error('本轮面试出现异常', new Error(event.message), '训练服务暂时不可用。');
  }
}

async function synchronizeSession(dispatch: Dispatch<InterviewAction>, sessionId: string) {
  try {
    const session = await getInterview(sessionId);
    applyInterviewCommandResult(dispatch, session);
    dispatch({ type: 'clear_stream' });
  } catch (error) {
    dispatch({ type: 'failure', message: interviewErrorMessage(error) });
  }
}

async function synchronizeReport(
  dispatch: Dispatch<InterviewAction>,
  sessionId: string,
  notifications: NotificationApi,
) {
  const snapshot = await loadInterviewSnapshot({
    loadSession: () => getInterview(sessionId),
    loadReport: () => getInterviewReport(sessionId),
  });
  if (snapshot.status === 'error') {
    dispatch({ type: 'failure', message: interviewErrorMessage(snapshot.error) });
    notifications.error('面试复盘同步失败', snapshot.error, '复盘暂时无法同步，请稍后重试。');
    return;
  }
  dispatch({ type: 'session', session: snapshot.session });
  if (snapshot.report) dispatch({ type: 'report', report: snapshot.report });
  dispatch({ type: 'clear_stream' });
  if (snapshot.status === 'partial') {
    dispatch({
      type: 'notice',
      notice: '本轮复盘已生成，报告内容暂时无法读取，请刷新页面重试。',
    });
    notifications.info('面试复盘已生成', '报告内容暂时无法读取，刷新页面可重试。');
  } else {
    notifications.success('面试复盘已生成', '评分、薄弱点和下一步建议已由服务端返回。');
  }
}

export type InterviewController = ReturnType<typeof useInterviewController>;
