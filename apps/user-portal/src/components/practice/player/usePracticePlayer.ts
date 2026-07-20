'use client';

import type { PracticeSession } from '@interview-agent/contracts';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  completePracticeSelfStudy,
  getMasteryProfiles,
  getPracticeReport,
  getPracticeSession,
  submitPracticeSession,
} from '@/lib/practice-api';
import { answerDrafts } from '../practice-utils';
import { confirmAiReportSubmission, initialPracticeItemIndex } from './practice-player-model';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  setActionError,
  setBusy,
  usePracticeItemActions,
  type PlayerState,
  type PracticeActionContext,
} from './practice-player-actions';

export type { PlayerBusy, PlayerIssue } from './practice-player-actions';

const INITIAL_STATE: PlayerState = {
  session: null,
  drafts: {},
  solutions: {},
  report: null,
  mastery: [],
  currentIndex: 0,
  loading: false,
  loadError: '',
  busy: null,
  issue: null,
  message: '',
  aiOperation: null,
};

export function usePracticePlayer() {
  const notifications = useNotifications();
  const sessionId = useSearchParams().get('session');
  const loader = usePracticeSessionLoader(sessionId);
  const context = { sessionId, state: loader.state, setState: loader.setState, notifications };
  const itemActions = usePracticeItemActions(context);
  const completionActions = usePracticeCompletionActions(context);
  const setCurrentIndex = useCallback(
    (currentIndex: number) => {
      loader.setState((state) => ({ ...state, currentIndex, issue: null, message: '' }));
    },
    [loader],
  );
  const updateDraft = useCallback(
    (itemId: string, value: string) => {
      loader.setState((state) => ({ ...state, drafts: { ...state.drafts, [itemId]: value } }));
    },
    [loader],
  );
  return {
    sessionId,
    ...loader.state,
    reload: loader.reload,
    setCurrentIndex,
    updateDraft,
    ...itemActions,
    ...completionActions,
  };
}

function usePracticeSessionLoader(sessionId: string | null) {
  const [state, setState] = useState<PlayerState>(INITIAL_STATE);
  const reload = useCallback(async () => {
    if (!sessionId) {
      setState(INITIAL_STATE);
      return;
    }
    setState((current) => ({ ...current, loading: true, loadError: '', issue: null }));
    try {
      const session = await getPracticeSession(sessionId);
      const extras = await loadCompletionExtras(session);
      setState({
        ...INITIAL_STATE,
        session,
        drafts: answerDrafts(session),
        currentIndex: initialPracticeItemIndex(session),
        report: extras.report,
        mastery: extras.mastery,
      });
    } catch {
      setState((current) => ({
        ...current,
        loading: false,
        loadError: '这轮练习暂时无法恢复，请检查链接后重试。',
      }));
    }
  }, [sessionId]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { state, setState, reload };
}

async function loadCompletionExtras(session: PracticeSession) {
  if (session.status !== 'report_ready') return { report: null, mastery: [] };
  try {
    const [report, mastery] = await Promise.all([
      getPracticeReport(session.id),
      getMasteryProfiles(),
    ]);
    return { report, mastery };
  } catch {
    return { report: null, mastery: [] };
  }
}

function usePracticeCompletionActions(context: PracticeActionContext) {
  const submitAiReport = useCallback(async () => {
    if (!context.sessionId || !context.state.session) return;
    const confirmed = confirmAiReportSubmission(context.state.session, (message) =>
      window.confirm(message),
    );
    if (!confirmed) return;
    setBusy(context.setState, 'submit-ai');
    try {
      const report = await submitPracticeSession(context.sessionId);
      const [session, mastery] = await Promise.all([
        getPracticeSession(context.sessionId),
        getMasteryProfiles(),
      ]);
      context.setState((state) => ({
        ...state,
        session,
        report,
        mastery,
        busy: null,
        issue: null,
        message: 'AI 复盘已生成，能力记录已同步更新。',
      }));
      context.notifications.success('AI 复盘已生成', '评分与能力记录已从服务端同步完成。');
    } catch (error) {
      setActionError(context, error, 'AI 复盘生成失败');
    }
  }, [context]);
  const completeSelfStudy = useCallback(async () => {
    if (!context.sessionId) return;
    setBusy(context.setState, 'submit-self');
    try {
      const session = await completePracticeSelfStudy(context.sessionId);
      context.setState((state) => ({
        ...state,
        session,
        busy: null,
        issue: null,
        message: '本轮自学已结束，不会生成 AI 分数或能力记录。',
      }));
      context.notifications.success('本轮自学已完成', '服务端已保存练习完成状态。');
    } catch (error) {
      setActionError(context, error, '自学完成状态保存失败');
    }
  }, [context]);
  return { submitAiReport, completeSelfStudy };
}
