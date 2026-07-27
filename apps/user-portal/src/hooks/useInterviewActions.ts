'use client';

import { useCallback, useState, type Dispatch } from 'react';
import type { AiOperationStreamEvent, InterviewSession } from '@interview-agent/contracts';
import type { InterviewAction } from '@/components/interview/interview-state';
import { hasUsableInterviewModel } from '@/components/interview/interview-readiness';
import type { NotificationApi } from '@/components/notifications/NotificationProvider';
import {
  advanceInterviewStream,
  answerInterviewStream,
  startInterview,
  type InterviewNextStreamResult,
} from '@/lib/interview-api';
import { listModelCredentials } from '@/lib/model-credentials-api';
import { interviewPlanForJob } from '@/lib/interview-roles';
import { interviewErrorMessage, interviewStatusNotice } from './interview-feedback';
import { createExclusiveInterviewActionRunner } from './interview-action-single-flight';

type StreamConnector = (sessionId: string, cursor: number) => void;
type InterviewActionOptions = {
  selectedJobId: string;
  interviewPlan: ReturnType<typeof interviewPlanForJob>;
  session: InterviewSession | null;
  draft: string;
  dispatch: Dispatch<InterviewAction>;
  connect: StreamConnector;
  disconnect: () => void;
  notifications: NotificationApi;
  clearDraft: (sessionId: string) => void;
};

export function useInterviewActions(options: InterviewActionOptions) {
  const [runExclusive] = useState(createExclusiveInterviewActionRunner);
  const start = useCallback(
    () =>
      runExclusive(() =>
        executeStart({
          selectedJobId: options.selectedJobId,
          interviewPlan: options.interviewPlan,
          dispatch: options.dispatch,
          connect: options.connect,
          disconnect: options.disconnect,
          notifications: options.notifications,
        }),
      ),
    [
      options.connect,
      options.disconnect,
      options.dispatch,
      options.interviewPlan,
      options.notifications,
      options.selectedJobId,
      runExclusive,
    ],
  );
  const submitAnswer = useCallback(
    () =>
      runExclusive(() =>
        executeAnswer({
          session: options.session,
          draft: options.draft,
          dispatch: options.dispatch,
          connect: options.connect,
          notifications: options.notifications,
          clearDraft: options.clearDraft,
        }),
      ),
    [
      options.clearDraft,
      options.connect,
      options.dispatch,
      options.draft,
      options.notifications,
      options.session,
      runExclusive,
    ],
  );
  return { start, submitAnswer };
}

type StartContext = Pick<
  InterviewActionOptions,
  'selectedJobId' | 'interviewPlan' | 'dispatch' | 'connect' | 'disconnect' | 'notifications'
>;

async function executeStart(context: StartContext) {
  context.dispatch({ type: 'busy', busy: true });
  try {
    const credentials = await listModelCredentials();
    if (!hasUsableInterviewModel(credentials)) {
      const issue = '开始模拟前，请先在模型设置中连接、测试并设为默认模型。';
      context.dispatch({ type: 'failure', message: issue });
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
      { expectedVersion: started.session.version },
      { onEvent: (event) => handleAiOperationEvent(context.dispatch, event) },
    );
    applyStreamResult(context.dispatch, advanced);
    context.connect(advanced.result.session.id, advanced.result.eventCursor);
    context.notifications.success('模拟面试已开始', '服务端已创建会话，AI 面试官正在准备第一题。');
  } catch (error) {
    context.dispatch({ type: 'failure', message: interviewErrorMessage(error) });
    context.notifications.error('模拟面试启动失败', error, '模拟面试没有启动，请稍后重试。');
  }
}

type AnswerContext = Pick<
  InterviewActionOptions,
  'session' | 'draft' | 'dispatch' | 'connect' | 'notifications' | 'clearDraft'
>;

async function executeAnswer(context: AnswerContext) {
  const answer = context.draft.trim();
  if (!context.session || !answer) return;
  context.dispatch({ type: 'busy', busy: true });
  context.dispatch({ type: 'clear_stream' });
  try {
    const result = await answerInterviewStream(
      context.session.id,
      { answer, expectedVersion: context.session.version },
      { onEvent: (event) => handleAiOperationEvent(context.dispatch, event) },
    );
    applyStreamResult(context.dispatch, result);
    context.clearDraft(context.session.id);
    context.dispatch({ type: 'draft', draft: '' });
    context.connect(result.result.session.id, result.result.eventCursor);
    context.notifications.success('回答已提交', '服务端已保存回答，AI 面试官正在组织追问。');
  } catch (error) {
    context.dispatch({ type: 'failure', message: interviewErrorMessage(error) });
    context.notifications.error('回答提交失败', error, '回答没有提交，请稍后重试。');
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
  applyInterviewCommandResult(dispatch, stream.result.session);
}

export function applyInterviewCommandResult(
  dispatch: Dispatch<InterviewAction>,
  session: InterviewSession,
) {
  const processing = session.status === 'running' || session.status === 'generating_report';
  dispatch({ type: 'session', session });
  dispatch({ type: 'busy', busy: processing });
  dispatch({ type: 'notice', notice: interviewStatusNotice(session.status) });
}
