'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, type Dispatch } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  AgentStreamEvent,
  InterviewSession,
  JobIntentPayload,
} from '@interview-agent/contracts';
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
  const onSessionStarted = useInterviewSessionNavigation();
  const archivedRestore = useInterviewRestore({
    /* URL 尚未带上 session 参数时也允许对活动会话手动重查状态。 */
    restoredSessionId: restoredSessionId ?? state.session?.id ?? null,
    session: state.session,
    dispatch,
    connect,
    disconnect,
  });
  const selectedJob = useSelectedInterviewJob(jobs, selectedJobId);
  const commands = useInterviewCommands({
    state,
    restoredSessionId,
    selectedJob,
    dispatch,
    connect,
    disconnect,
    notifications,
    onSessionStarted,
  });
  const turns = state.session?.turns ?? [];
  return {
    state,
    restoredSessionId,
    archivedLoadFailed: archivedRestore.loadFailed,
    archivedReloading: archivedRestore.reloading,
    reloadArchivedInterview: archivedRestore.retry,
    selectedJobId,
    setSelectedJobId,
    draftRecovered: commands.draftRecovered,
    setDraft: commands.setDraft,
    start: commands.start,
    submitAnswer: commands.submitAnswer,
    turns,
    canAnswer: canAnswerInterview(state.session, state.busy),
    interviewPlan: commands.interviewPlan,
    statusLabel: interviewStatusLabel(state.session),
  };
}

type InterviewCommandsInput = {
  state: ReturnType<typeof interviewReducer>;
  restoredSessionId: string | null;
  selectedJob: JobIntentPayload | undefined;
  dispatch: Dispatch<InterviewAction>;
  connect: (sessionId: string, cursor: number) => void;
  disconnect: () => void;
  notifications: NotificationApi;
  onSessionStarted: (sessionId: string) => void;
};

function useInterviewCommands(input: InterviewCommandsInput) {
  const draft = useInterviewDraft({
    sessionId: sessionIdOr(input.state.session, input.restoredSessionId),
    draft: input.state.draft,
    dispatch: input.dispatch,
    notifications: input.notifications,
  });
  const interviewPlan = useMemo(() => interviewPlanForJob(input.selectedJob), [input.selectedJob]);
  const actions = useInterviewActions({
    selectedJobId: selectedJobIntentId(input.selectedJob),
    interviewPlan,
    session: input.state.session,
    draft: input.state.draft,
    dispatch: input.dispatch,
    connect: input.connect,
    disconnect: input.disconnect,
    notifications: input.notifications,
    clearDraft: draft.clearDraft,
    onSessionStarted: input.onSessionStarted,
  });
  return { ...draft, ...actions, interviewPlan };
}

function useInterviewSessionNavigation() {
  const router = useRouter();
  return useCallback(
    (sessionId: string) => {
      router.replace(`/interview?session=${encodeURIComponent(sessionId)}`, { scroll: false });
    },
    [router],
  );
}

type InterviewRestoreInput = {
  restoredSessionId: string | null;
  session: InterviewSession | null;
  dispatch: Dispatch<InterviewAction>;
  connect: (sessionId: string, cursor: number) => void;
  disconnect: () => void;
};

function useInterviewRestore(input: InterviewRestoreInput) {
  return useArchivedInterview({
    sessionId: input.restoredSessionId,
    currentSessionId: input.session?.id ?? null,
    dispatch: input.dispatch,
    connect: input.connect,
    disconnect: input.disconnect,
  });
}

function sessionIdOr(session: InterviewSession | null, fallback: string | null) {
  return session?.id ?? fallback;
}

function selectedJobIntentId(job: JobIntentPayload | undefined) {
  return job?.intent.id ?? '';
}

function canAnswerInterview(session: InterviewSession | null, busy: boolean) {
  return session?.status === 'waiting_user' && !busy;
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
          dispatch({ type: 'connection_lost', message: interviewErrorMessage(error) });
          notifications.error(
            '面试实时连接中断',
            error,
            '连接已断开，可在复盘面板点击「重新检查」同步最新进度。',
          );
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
