'use client';

import type {
  MasteryProfile,
  PracticeItemSolution,
  PracticeReport,
  PracticeSession,
} from '@interview-agent/contracts';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiError } from '@/lib/api';
import {
  completePracticeSelfStudy,
  evaluatePracticeItem,
  getMasteryProfiles,
  getPracticeItemSolution,
  getPracticeReport,
  getPracticeSession,
  submitPracticeAnswer,
  submitPracticeSession,
} from '@/lib/practice-api';
import { answerDrafts } from '../practice-utils';
import { initialPracticeItemIndex } from './practice-player-model';

export type PlayerBusy = null | `save:${string}` | `solution:${string}` | `evaluate:${string}` | 'submit-ai' | 'submit-self';
export type PlayerIssue = { code: string; message: string } | null;

type PlayerState = {
  session: PracticeSession | null;
  drafts: Record<string, string>;
  solutions: Record<string, PracticeItemSolution>;
  report: PracticeReport | null;
  mastery: MasteryProfile[];
  currentIndex: number;
  loading: boolean;
  loadError: string;
  busy: PlayerBusy;
  issue: PlayerIssue;
  message: string;
};

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
};

export function usePracticePlayer() {
  const sessionId = useSearchParams().get('session');
  const loader = usePracticeSessionLoader(sessionId);
  const context = { sessionId, state: loader.state, setState: loader.setState };
  const itemActions = usePracticeItemActions(context);
  const completionActions = usePracticeCompletionActions(context);
  const setCurrentIndex = useCallback((currentIndex: number) => {
    loader.setState((state) => ({ ...state, currentIndex, issue: null, message: '' }));
  }, [loader]);
  const updateDraft = useCallback((itemId: string, value: string) => {
    loader.setState((state) => ({ ...state, drafts: { ...state.drafts, [itemId]: value } }));
  }, [loader]);
  return { sessionId, ...loader.state, reload: loader.reload, setCurrentIndex, updateDraft, ...itemActions, ...completionActions };
}

function usePracticeSessionLoader(sessionId: string | null) {
  const [state, setState] = useState<PlayerState>(INITIAL_STATE);
  const reload = useCallback(async () => {
    if (!sessionId) { setState(INITIAL_STATE); return; }
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
      setState((current) => ({ ...current, loading: false, loadError: '这轮练习暂时无法恢复，请检查链接后重试。' }));
    }
  }, [sessionId]);
  useEffect(() => { void reload(); }, [reload]);
  return { state, setState, reload };
}

async function loadCompletionExtras(session: PracticeSession) {
  if (session.status !== 'report_ready') return { report: null, mastery: [] };
  try {
    const [report, mastery] = await Promise.all([getPracticeReport(session.id), getMasteryProfiles()]);
    return { report, mastery };
  } catch {
    return { report: null, mastery: [] };
  }
}

type ActionContext = {
  sessionId: string | null;
  state: PlayerState;
  setState: Dispatch<SetStateAction<PlayerState>>;
};

function usePracticeItemActions(context: ActionContext) {
  const save = useCallback(async (itemId: string) => {
    if (!context.sessionId) return;
    const answer = context.state.drafts[itemId]?.trim();
    if (!answer) return setIssue(context.setState, 'ANSWER_REQUIRED', '请先写下回答再保存。');
    setBusy(context.setState, `save:${itemId}`);
    try {
      const session = await submitPracticeAnswer(context.sessionId, itemId, { answer });
      context.setState((state) => ({ ...state, session, drafts: { ...state.drafts, [itemId]: answer }, busy: null, issue: null, message: '回答已保存。' }));
    } catch (error) { setActionError(context.setState, error); }
  }, [context]);
  const revealSolution = useCallback(async (itemId: string) => {
    if (!context.sessionId) return;
    setBusy(context.setState, `solution:${itemId}`);
    try {
      const solution = await getPracticeItemSolution(context.sessionId, itemId);
      context.setState((state) => ({ ...state, solutions: { ...state.solutions, [itemId]: solution }, busy: null, issue: null }));
    } catch (error) { setActionError(context.setState, error); }
  }, [context]);
  const evaluate = useCallback(async (itemId: string) => {
    if (!context.sessionId) return;
    setBusy(context.setState, `evaluate:${itemId}`);
    try {
      const feedback = await evaluatePracticeItem(context.sessionId, itemId);
      context.setState((state) => applyFeedback(state, itemId, feedback));
    } catch (error) { setActionError(context.setState, error); }
  }, [context]);
  return { save, revealSolution, evaluate };
}

function usePracticeCompletionActions(context: ActionContext) {
  const submitAiReport = useCallback(async () => {
    if (!context.sessionId) return;
    setBusy(context.setState, 'submit-ai');
    try {
      const report = await submitPracticeSession(context.sessionId);
      const [session, mastery] = await Promise.all([getPracticeSession(context.sessionId), getMasteryProfiles()]);
      context.setState((state) => ({ ...state, session, report, mastery, busy: null, issue: null, message: 'AI 复盘已生成，能力记录已同步更新。' }));
    } catch (error) { setActionError(context.setState, error); }
  }, [context]);
  const completeSelfStudy = useCallback(async () => {
    if (!context.sessionId) return;
    setBusy(context.setState, 'submit-self');
    try {
      const session = await completePracticeSelfStudy(context.sessionId);
      context.setState((state) => ({ ...state, session, busy: null, issue: null, message: '本轮自学已结束，不会生成 AI 分数或能力记录。' }));
    } catch (error) { setActionError(context.setState, error); }
  }, [context]);
  return { submitAiReport, completeSelfStudy };
}

function applyFeedback(state: PlayerState, itemId: string, feedback: Awaited<ReturnType<typeof evaluatePracticeItem>>): PlayerState {
  if (!state.session) return { ...state, busy: null };
  const items = state.session.items.map((item) => item.id === itemId
    ? { ...item, status: 'evaluated' as const, evaluation: feedback.evaluation }
    : item);
  return {
    ...state,
    session: { ...state.session, items },
    solutions: { ...state.solutions, [itemId]: { referenceAnswer: feedback.referenceAnswer, rubric: feedback.rubric } },
    busy: null,
    issue: null,
    message: '真实模型评价已保存。',
  };
}

function setBusy(setState: ActionContext['setState'], busy: PlayerBusy) {
  setState((state) => ({ ...state, busy, issue: null, message: '' }));
}
function setIssue(setState: ActionContext['setState'], code: string, message: string) {
  setState((state) => ({ ...state, busy: null, issue: { code, message } }));
}
function setActionError(setState: ActionContext['setState'], error: unknown) {
  const issue = error instanceof ApiError
    ? { code: error.code, message: error.message }
    : { code: 'UNKNOWN_ERROR', message: '操作没有完成，已保存的回答不会丢失，请稍后重试。' };
  setState((state) => ({ ...state, busy: null, issue }));
}
