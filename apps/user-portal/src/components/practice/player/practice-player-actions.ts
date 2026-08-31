'use client';

import type {
  AiOperationPhase,
  AiOperationStreamEvent,
  MasteryProfile,
  PracticeItemSolution,
  PracticeReport,
  PracticeSession,
} from '@interview-agent/contracts';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { ApiError } from '@/lib/api';
import {
  evaluatePracticeItem,
  evaluatePracticeItemStream,
  getPracticeItemSolution,
  submitPracticeAnswer,
} from '@/lib/practice-api';
import { clearPracticeDraft } from '@/lib/practice-local-state';
import type { NotificationApi } from '@/components/notifications/NotificationProvider';
import {
  isCurrentPracticeEvaluation,
  practiceEvaluationCancelPatch,
} from './practice-evaluation-lifecycle';
import { createExclusivePracticeSaveRunner } from './practice-save-single-flight';
import { createExclusivePracticeSolutionRunner } from './practice-solution-single-flight';

export type PlayerBusy =
  | null
  | `save:${string}`
  | `solution:${string}`
  | `evaluate:${string}`
  | 'submit-ai'
  | 'submit-self';

export type PlayerIssue = { code: string; message: string } | null;

export type PlayerAiOperation = {
  itemId: string;
  phase: AiOperationPhase | null;
  visibleText: string;
};

export type PlayerState = {
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
  aiOperation: PlayerAiOperation | null;
};

export type PracticeActionContext = {
  sessionId: string | null;
  state: PlayerState;
  setState: Dispatch<SetStateAction<PlayerState>>;
  notifications: NotificationApi;
};

export function usePracticeItemActions(context: PracticeActionContext) {
  return {
    save: useSavePracticeAnswer(context),
    revealSolution: useRevealPracticeSolution(context),
    ...useEvaluatePracticeItem(context),
  };
}

function useSavePracticeAnswer(context: PracticeActionContext) {
  const [runExclusive] = useState(createExclusivePracticeSaveRunner);
  return useCallback(
    (itemId: string) =>
      runExclusive(async () => {
        if (!context.sessionId) return false;
        const answer = context.state.drafts[itemId]?.trim();
        if (!answer) {
          const issue = '请先写下回答再保存。';
          setIssue(context.setState, 'ANSWER_REQUIRED', issue);
          context.notifications.error('回答未保存', new Error(issue), issue);
          return false;
        }
        setBusy(context.setState, `save:${itemId}`);
        try {
          const session = await submitPracticeAnswer(context.sessionId, itemId, { answer });
          clearPracticeDraft(context.sessionId, itemId);
          context.setState((state) => ({
            ...state,
            session,
            drafts: { ...state.drafts, [itemId]: answer },
            busy: null,
            issue: null,
            message: '回答已保存。',
          }));
          context.notifications.success('回答已保存', '服务端已记录本题回答。');
          return true;
        } catch (error) {
          setActionError(context, error, '回答保存失败');
          return false;
        }
      }),
    [context, runExclusive],
  );
}

function useRevealPracticeSolution(context: PracticeActionContext) {
  const [runExclusive] = useState(createExclusivePracticeSolutionRunner);
  return useCallback(
    (itemId: string) =>
      runExclusive(async () => {
        if (!context.sessionId) return;
        setBusy(context.setState, `solution:${itemId}`);
        try {
          const solution = await getPracticeItemSolution(context.sessionId, itemId);
          context.setState((state) => ({
            ...state,
            solutions: { ...state.solutions, [itemId]: solution },
            busy: null,
            issue: null,
          }));
        } catch (error) {
          setActionError(context, error, '参考答案加载失败');
        }
      }),
    [context, runExclusive],
  );
}

function useEvaluatePracticeItem(context: PracticeActionContext) {
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  const evaluate = useCallback(
    async (itemId: string) => {
      if (!context.sessionId) return;
      setBusy(context.setState, `evaluate:${itemId}`);
      const controller = new AbortController();
      controllerRef.current?.abort();
      controllerRef.current = controller;
      context.setState((state) => ({
        ...state,
        aiOperation: { itemId, phase: null, visibleText: '' },
      }));
      try {
        const feedback = await evaluatePracticeItemStream(context.sessionId, itemId, {
          signal: controller.signal,
          onEvent: (event) => updateAiOperation(context.setState, itemId, event),
        });
        if (!isCurrentPracticeEvaluation(controllerRef.current, controller)) return;
        context.setState((state) => applyFeedback(state, itemId, feedback));
        context.notifications.success('AI 评价已保存', '真实模型评价与参考答案已由服务端返回。');
      } catch (error) {
        if (!isCurrentPracticeEvaluation(controllerRef.current, controller)) return;
        setActionError(context, error, 'AI 评价失败');
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [context],
  );
  const cancelEvaluation = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    controllerRef.current = null;
    controller.abort();
    context.setState((state) => ({ ...state, ...practiceEvaluationCancelPatch() }));
  }, [context]);
  return { evaluate, cancelEvaluation };
}

function applyFeedback(
  state: PlayerState,
  itemId: string,
  feedback: Awaited<ReturnType<typeof evaluatePracticeItem>>,
): PlayerState {
  if (!state.session) return { ...state, busy: null };
  const items = state.session.items.map((item) =>
    item.id === itemId
      ? { ...item, status: 'evaluated' as const, evaluation: feedback.evaluation }
      : item,
  );
  return {
    ...state,
    session: { ...state.session, items },
    solutions: {
      ...state.solutions,
      [itemId]: { referenceAnswer: feedback.referenceAnswer, rubric: feedback.rubric },
    },
    busy: null,
    issue: null,
    aiOperation: null,
    message: '真实模型评价已保存。',
  };
}

export function setBusy(setState: PracticeActionContext['setState'], busy: PlayerBusy) {
  setState((state) => ({ ...state, busy, issue: null, message: '', aiOperation: null }));
}

function setIssue(setState: PracticeActionContext['setState'], code: string, message: string) {
  setState((state) => ({ ...state, busy: null, issue: { code, message } }));
}

export function setActionError(context: PracticeActionContext, error: unknown, title: string) {
  const issue =
    error instanceof ApiError
      ? { code: error.code, message: error.message }
      : { code: 'UNKNOWN_ERROR', message: '操作没有完成，已保存的回答不会丢失，请稍后重试。' };
  context.setState((state) => ({ ...state, busy: null, issue, aiOperation: null }));
  context.notifications.error(title, error, issue.message);
}

function updateAiOperation(
  setState: PracticeActionContext['setState'],
  itemId: string,
  event: AiOperationStreamEvent,
) {
  if (event.type !== 'phase' && event.type !== 'delta') return;
  setState((state) => {
    if (state.aiOperation?.itemId !== itemId) return state;
    if (event.type === 'phase') {
      return { ...state, aiOperation: { ...state.aiOperation, phase: event.phase } };
    }
    if (event.channel !== 'evaluation_feedback') return state;
    return {
      ...state,
      aiOperation: {
        ...state.aiOperation,
        visibleText: state.aiOperation.visibleText + event.content,
      },
    };
  });
}
