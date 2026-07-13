'use client';

import { useCallback, useEffect, useReducer, useRef, useState, type Dispatch } from 'react';
import type {
  AgentStreamEvent,
  InterviewSession,
  InterviewSessionStatus,
  JobIntentPayload,
} from '@interview-agent/contracts';
import {
  INITIAL_INTERVIEW_STATE,
  STARTER_ANSWERS,
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
import { subscribeInterviewEvents } from '@/lib/interview-stream';

const INTERVIEW_TITLE = 'Agent 应用工程模拟面试';
const FOCUS_TAGS = ['Agent Runtime', 'RAG 权限', 'SSE', '可观测性'] as const;

type StreamConnector = (sessionId: string, cursor: number) => void;
type StartContext = {
  selectedJobId: string;
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
  const start = useCallback(
    () => executeStart({ selectedJobId, dispatch, connect, disconnect }),
    [connect, disconnect, selectedJobId],
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
    statusLabel: sessionStatusLabel(state.session),
  };
}

function useSelectedJob(jobs: JobIntentPayload[]) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.intent.id ?? '');
  useEffect(() => {
    if (!selectedJobId && jobs[0]) setSelectedJobId(jobs[0].intent.id);
  }, [jobs, selectedJobId]);
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
          dispatch({ type: 'failure', message: error.message });
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
      title: INTERVIEW_TITLE,
      focusTags: [...FOCUS_TAGS],
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
    context.connect(result.session.id, result.eventCursor);
    const count = result.session.turns.filter(isCandidateTurn).length;
    context.dispatch({ type: 'draft', draft: starterAnswer(count) });
  } catch (error) {
    context.dispatch({ type: 'failure', message: errorMessage(error) });
  }
}

function isCandidateTurn(turn: InterviewSession['turns'][number]): boolean {
  return turn.role === 'candidate';
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
      dispatch({ type: 'failure', message: event.message });
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
  if (status === 'waiting_user') return '等待候选人回答。';
  if (status === 'report_ready') return '面试报告已生成。';
  if (isProcessing(status)) {
    return 'Agent 正在处理，结果将由 Product API 同步。';
  }
  return '会话状态已由 Product API 更新。';
}

function sessionStatusLabel(session: InterviewSession | null): string {
  return session ? session.status + ' · ' + session.stage : 'not_started';
}

function retryNotice(retry: { attempt: number; delayMs: number }): string {
  return `SSE 连接中断，将在 ${retry.delayMs}ms 后进行第 ${retry.attempt} 次重连。`;
}

function starterAnswer(index: number): string {
  return STARTER_ANSWERS[index % STARTER_ANSWERS.length] ?? STARTER_ANSWERS[0];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '面试操作失败，请稍后重试。';
}

export type InterviewController = ReturnType<typeof useInterviewController>;
