'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type Dispatch } from 'react';
import type {
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
  advanceInterview,
  answerInterview,
  getInterview,
  getInterviewReport,
  startInterview,
} from '@/lib/interview-api';
import { interviewPlanForJob } from '@/lib/interview-roles';
import { subscribeInterviewEvents } from '@/lib/interview-stream';

const MILLISECONDS_PER_SECOND = 1_000;
const INTERNAL_ERROR_TERMS = /Product API|Agent Runtime|\bSSE\b|\bRuntime\b/iu;

type InterviewPlan = ReturnType<typeof interviewPlanForJob>;
type StreamConnector = (sessionId: string, cursor: number) => void;
type StartContext = {
  selectedJobId: string;
  interviewPlan: InterviewPlan;
  dispatch: Dispatch<InterviewAction>;
  connect: StreamConnector;
  disconnect: () => void;
};
type AnswerContext = {
  session: InterviewSession | null;
  draft: string;
  dispatch: Dispatch<InterviewAction>;
  connect: StreamConnector;
};

export function useInterviewController(jobs: JobIntentPayload[]) {
  const [state, dispatch] = useReducer(interviewReducer, INITIAL_INTERVIEW_STATE);
  const [selectedJobId, setSelectedJobId] = useSelectedJob(jobs);
  const [connect, disconnect] = useInterviewStream(dispatch);
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
      }),
    [connect, disconnect, interviewPlan, selectedJob?.intent.id],
  );
  const submitAnswer = useCallback(
    () =>
      executeAnswer({
        session: state.session,
        draft: state.draft,
        dispatch,
        connect,
      }),
    [connect, state.draft, state.session],
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
    statusLabel: sessionStatusLabel(state.session),
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

function useInterviewStream(dispatch: Dispatch<InterviewAction>) {
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
        onEvent: (event) => handleStreamEvent(dispatch, event),
        onRetry: (retry) => dispatch({ type: 'notice', notice: retryNotice(retry) }),
        onTerminalError: (error) => {
          dispatch({ type: 'failure', message: errorMessage(error) });
        },
      });
    },
    [disconnect, dispatch],
  );
  useEffect(() => disconnect, [disconnect]);
  return [connect, disconnect] as const;
}

async function executeStart(context: StartContext) {
  context.disconnect();
  context.dispatch({ type: 'reset' });
  try {
    const started = await startInterview({
      ...(context.selectedJobId ? { jobIntentId: context.selectedJobId } : {}),
      title: context.interviewPlan.title,
      focusTags: context.interviewPlan.focusTags,
    });
    context.dispatch({ type: 'session', session: started.session });
    context.connect(started.session.id, started.eventCursor);
    const advanced = await advanceInterview(started.session.id, {
      expectedVersion: started.session.version,
    });
    applyCommandResult(context.dispatch, advanced.session);
  } catch (error) {
    context.dispatch({ type: 'failure', message: errorMessage(error) });
  }
}

async function executeAnswer(context: AnswerContext) {
  const answer = context.draft.trim();
  if (!context.session || !answer) return;
  context.dispatch({ type: 'busy', busy: true });
  context.dispatch({ type: 'clear_stream' });
  try {
    const result = await answerInterview(context.session.id, {
      answer,
      expectedVersion: context.session.version,
    });
    applyCommandResult(context.dispatch, result.session);
    context.dispatch({ type: 'draft', draft: '' });
    context.connect(result.session.id, result.eventCursor);
  } catch (error) {
    context.dispatch({ type: 'failure', message: errorMessage(error) });
  }
}

function handleStreamEvent(dispatch: Dispatch<InterviewAction>, event: AgentStreamEvent) {
  dispatch({ type: 'event', event });
  switch (event.type) {
    case 'token':
      dispatch({ type: 'token', content: event.content });
      return;
    case 'turn_completed':
      void synchronizeSession(dispatch, event.sessionId);
      return;
    case 'report_ready':
      void synchronizeReport(dispatch, event.sessionId);
      return;
    case 'error':
      dispatch({ type: 'failure', message: errorMessage(new Error(event.message)) });
  }
}

async function synchronizeSession(dispatch: Dispatch<InterviewAction>, sessionId: string) {
  try {
    const session = await getInterview(sessionId);
    applyCommandResult(dispatch, session);
    dispatch({ type: 'clear_stream' });
  } catch (error) {
    dispatch({ type: 'failure', message: errorMessage(error) });
  }
}

async function synchronizeReport(dispatch: Dispatch<InterviewAction>, sessionId: string) {
  try {
    const [session, report] = await Promise.all([
      getInterview(sessionId),
      getInterviewReport(sessionId),
    ]);
    dispatch({ type: 'session', session });
    dispatch({ type: 'report', report });
    dispatch({ type: 'clear_stream' });
  } catch (error) {
    dispatch({ type: 'failure', message: errorMessage(error) });
  }
}

function applyCommandResult(dispatch: Dispatch<InterviewAction>, session: InterviewSession) {
  dispatch({ type: 'session', session });
  dispatch({ type: 'busy', busy: isProcessing(session.status) });
  dispatch({ type: 'notice', notice: statusNotice(session.status) });
}

function isProcessing(status: InterviewSessionStatus): boolean {
  return status === 'running' || status === 'generating_report';
}

function statusNotice(status: InterviewSessionStatus): string {
  switch (status) {
    case 'created':
      return 'AI 面试官正在准备第一题，请稍候。';
    case 'running':
      return 'AI 面试官正在组织追问…';
    case 'waiting_user':
      return '轮到你作答。可按背景、目标、行动、结果组织回答。';
    case 'generating_report':
      return 'AI 面试官正在整理本轮复盘…';
    case 'report_ready':
      return '本轮复盘已生成，可查看得分和下一步建议。';
    case 'failed':
      return '本轮训练暂未完成，请稍后重新开始。';
    case 'cancelled':
      return '本轮训练已结束。';
  }
}

function sessionStatusLabel(session: InterviewSession | null): string {
  if (!session) return '等待开始';
  return statusLabel(session.status);
}

function statusLabel(status: InterviewSessionStatus): string {
  switch (status) {
    case 'created':
      return '准备第一题';
    case 'running':
      return '正在组织追问';
    case 'waiting_user':
      return '等待你的回答';
    case 'generating_report':
      return '正在生成复盘';
    case 'report_ready':
      return '复盘已生成';
    case 'failed':
      return '本轮出现异常';
    case 'cancelled':
      return '本轮已结束';
  }
}

function retryNotice(retry: { attempt: number; delayMs: number }): string {
  const seconds = Math.max(1, Math.ceil(retry.delayMs / MILLISECONDS_PER_SECOND));
  return `连接短暂中断，正在自动恢复（第 ${retry.attempt} 次，约 ${seconds}s 后）。`;
}
function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : '';
  if (!message || INTERNAL_ERROR_TERMS.test(message)) {
    return '训练服务暂时不可用，请稍后重试。';
  }
  return message;
}

export type InterviewController = ReturnType<typeof useInterviewController>;

