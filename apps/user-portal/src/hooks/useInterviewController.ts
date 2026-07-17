'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
} from 'react';
import type {
  AiOperationStreamEvent,
  AgentStreamEvent,
  InterviewSession,
  InterviewSessionStatus,
  JobIntentPayload,
} from '@interview-agent/contracts';
import {
  INITIAL_INTERVIEW_STATE,
  interviewReducer,
  type InterviewAction,
} from '@/components/interview/interview-state';
import {
  advanceInterviewStream,
  answerInterviewStream,
  getInterview,
  getInterviewReport,
  startInterview,
  type InterviewNextStreamResult,
} from '@/lib/interview-api';
import { listModelCredentials } from '@/lib/model-credentials-api';
import { interviewPlanForJob } from '@/lib/interview-roles';
import { subscribeInterviewEvents } from '@/lib/interview-stream';
import { hasUsableInterviewModel } from '@/components/interview/interview-readiness';
import {
  useNotifications,
  type NotificationApi,
} from '@/components/notifications/NotificationProvider';
import {
  interviewErrorMessage,
  interviewRetryNotice,
  interviewStatusLabel,
  interviewStatusNotice,
} from './interview-feedback';

type InterviewPlan = ReturnType<typeof interviewPlanForJob>;
type StreamConnector = (sessionId: string, cursor: number) => void;
type StartContext = {
  selectedJobId: string;
  interviewPlan: InterviewPlan;
  dispatch: Dispatch<InterviewAction>;
  connect: StreamConnector;
  disconnect: () => void;
  notifications: NotificationApi;
};
type AnswerContext = {
  session: InterviewSession | null;
  draft: string;
  dispatch: Dispatch<InterviewAction>;
  connect: StreamConnector;
  notifications: NotificationApi;
};

export function useInterviewController(jobs: JobIntentPayload[]) {
  const notifications = useNotifications();
  const [state, dispatch] = useReducer(interviewReducer, INITIAL_INTERVIEW_STATE);
  const [selectedJobId, setSelectedJobId] = useSelectedJob(jobs);
  const [connect, disconnect] = useInterviewStream(dispatch, notifications);
  const selectedJob = useMemo(
    () => jobs.find((job) => job.intent.id === selectedJobId),
    [jobs, selectedJobId],
  );
  const interviewPlan = useMemo(() => interviewPlanForJob(selectedJob), [selectedJob]);
  const start = useCallback(
    () =>
      executeStart({
        selectedJobId: selectedJob?.intent.id ?? '',
        interviewPlan,
        dispatch,
        connect,
        disconnect,
        notifications,
      }),
    [connect, disconnect, interviewPlan, notifications, selectedJob?.intent.id],
  );
  const submitAnswer = useCallback(
    () =>
      executeAnswer({
        session: state.session,
        draft: state.draft,
        dispatch,
        connect,
        notifications,
      }),
    [connect, notifications, state.draft, state.session],
  );
  const setDraft = useCallback((draft: string) => dispatch({ type: 'draft', draft }), []);
  const turns = state.session?.turns ?? [];
  const canAnswer = state.session?.status === 'waiting_user' && !state.busy;
  return {
    state,
    selectedJobId,
    setSelectedJobId,
    setDraft,
    start,
    submitAnswer,
    turns,
    canAnswer,
    interviewPlan,
    statusLabel: interviewStatusLabel(state.session),
  };
}

function useSelectedJob(jobs: JobIntentPayload[]) {
  const [selectedJobId, setSelectedJobId] = useState('');
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || !jobs[0]) return;
    initializedRef.current = true;
    setSelectedJobId(jobs[0].intent.id);
  }, [jobs]);
  return [selectedJobId, setSelectedJobId] as const;
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

async function executeStart(context: StartContext) {
  context.dispatch({ type: 'busy', busy: true });
  try {
    const credentials = await listModelCredentials();
    if (!hasUsableInterviewModel(credentials)) {
      const issue = '开始模拟前，请先在模型设置中连接、测试并设为默认模型。';
      context.dispatch({
        type: 'failure',
        message: issue,
      });
      context.notifications.error('模拟面试未开始', new Error(issue), issue);
      return;
    }
    context.disconnect();
    context.dispatch({ type: 'reset' });
    const started = await startInterview({
      ...(context.selectedJobId ? { jobIntentId: context.selectedJobId } : {}),
      title: context.interviewPlan.title,
      focusTags: context.interviewPlan.focusTags,
    });
    context.dispatch({ type: 'session', session: started.session });
    const advanced = await advanceInterviewStream(
      started.session.id,
      {
        expectedVersion: started.session.version,
      },
      {
        onEvent: (event) => handleAiOperationEvent(context.dispatch, event),
      },
    );
    applyStreamResult(context.dispatch, advanced);
    context.connect(advanced.result.session.id, advanced.result.eventCursor);
    context.notifications.success('模拟面试已开始', '服务端已创建会话，AI 面试官正在准备第一题。');
  } catch (error) {
    context.dispatch({ type: 'failure', message: interviewErrorMessage(error) });
    context.notifications.error('模拟面试启动失败', error, '模拟面试没有启动，请稍后重试。');
  }
}

async function executeAnswer(context: AnswerContext) {
  const answer = context.draft.trim();
  if (!context.session || !answer) return;
  context.dispatch({ type: 'busy', busy: true });
  context.dispatch({ type: 'clear_stream' });
  try {
    const result = await answerInterviewStream(
      context.session.id,
      {
        answer,
        expectedVersion: context.session.version,
      },
      {
        onEvent: (event) => handleAiOperationEvent(context.dispatch, event),
      },
    );
    applyStreamResult(context.dispatch, result);
    context.dispatch({ type: 'draft', draft: '' });
    context.connect(result.result.session.id, result.result.eventCursor);
    context.notifications.success('回答已提交', '服务端已保存回答，AI 面试官正在组织追问。');
  } catch (error) {
    context.dispatch({ type: 'failure', message: interviewErrorMessage(error) });
    context.notifications.error('回答提交失败', error, '回答没有提交，请稍后重试。');
  }
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

function handleAiOperationEvent(
  dispatch: Dispatch<InterviewAction>,
  event: AiOperationStreamEvent,
) {
  if (event.type === 'phase') {
    dispatch({ type: 'stream_phase', phase: event.phase });
    return;
  }
  if (event.type === 'delta' && event.channel === 'interviewer_content') {
    dispatch({ type: 'token', content: event.content });
  }
}

function applyStreamResult(dispatch: Dispatch<InterviewAction>, stream: InterviewNextStreamResult) {
  dispatch({
    type: 'stream_result',
    session: stream.result.session,
    basisSummary: stream.basisSummary,
  });
  applyCommandResult(dispatch, stream.result.session);
}

async function synchronizeSession(dispatch: Dispatch<InterviewAction>, sessionId: string) {
  try {
    const session = await getInterview(sessionId);
    applyCommandResult(dispatch, session);
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
  try {
    const [session, report] = await Promise.all([
      getInterview(sessionId),
      getInterviewReport(sessionId),
    ]);
    dispatch({ type: 'session', session });
    dispatch({ type: 'report', report });
    dispatch({ type: 'clear_stream' });
    notifications.success('面试复盘已生成', '评分、薄弱点和下一步建议已由服务端返回。');
  } catch (error) {
    dispatch({ type: 'failure', message: interviewErrorMessage(error) });
    notifications.error('面试复盘同步失败', error, '复盘暂时无法同步，请稍后重试。');
  }
}

function applyCommandResult(dispatch: Dispatch<InterviewAction>, session: InterviewSession) {
  dispatch({ type: 'session', session });
  dispatch({ type: 'busy', busy: isProcessing(session.status) });
  dispatch({ type: 'notice', notice: interviewStatusNotice(session.status) });
}

function isProcessing(status: InterviewSessionStatus): boolean {
  return status === 'running' || status === 'generating_report';
}

export type InterviewController = ReturnType<typeof useInterviewController>;
