'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import {
  completePracticeSelfStudy,
  createPracticeSession,
  getMasteryProfiles,
  getPracticeReport,
  getPracticeSession,
  submitPracticeSession,
} from '@/lib/practice-api';
import { getPracticeRecommendations } from '@/lib/question-catalog-api';
import {
  clearPracticeLocalState,
  loadPracticeLocalState,
  savePracticeDraft,
  savePracticeIndex,
} from '@/lib/practice-local-state';
import { startWeaknessReview as runWeaknessReview } from '@/lib/weakness-review';
import { practiceRecoveryMessage, restorePracticeWorkspace } from './practice-player-model';
import {
  loadPracticeCompletionExtras,
  practiceReportOutcome,
  reconcilePracticeReport,
} from './practice-report-reconciliation';
import { createExclusivePracticeCompletionRunner } from './practice-completion-single-flight';
import {
  createExclusivePracticeContinuationRunner,
  startNextRecommendedPractice,
} from './practice-continuation';
import { practiceReturnOriginFromValues } from './practice-return-origin';
import { useLearningPracticeEvidence } from './useLearningPracticeEvidence';
import { createLatestRequestRunner } from '@interview-agent/api-client';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const returnOrigin = practiceReturnOriginFromValues(
    searchParams.getAll('origin'),
    searchParams.getAll('course'),
    searchParams.getAll('topic'),
  );
  const loader = usePracticeSessionLoader(sessionId);
  useLearningPracticeEvidence(returnOrigin, loader.state.session, loader.state.report);
  const context = { sessionId, state: loader.state, setState: loader.setState, notifications };
  const itemActions = usePracticeItemActions(context);
  const completionActions = usePracticeCompletionActions(context, router);
  const setCurrentIndex = useCallback(
    (currentIndex: number) => {
      if (sessionId) savePracticeIndex(sessionId, currentIndex);
      loader.setState((state) => ({ ...state, currentIndex, issue: null, message: '' }));
    },
    [loader, sessionId],
  );
  const updateDraft = useCallback(
    (itemId: string, value: string) => {
      if (sessionId) savePracticeDraft({ sessionId, itemId, draft: value });
      loader.setState((state) => ({
        ...state,
        drafts: { ...state.drafts, [itemId]: value },
        message: '',
      }));
    },
    [loader, sessionId],
  );
  return {
    sessionId,
    returnOrigin,
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
  const [request] = useState(createLatestRequestRunner);
  const reload = useCallback(() => {
    if (!sessionId) {
      request.invalidate();
      setState(INITIAL_STATE);
      return Promise.resolve(false);
    }
    setState((current) => ({ ...current, loading: true, loadError: '', issue: null }));
    return request.run({
      load: () => loadPracticePlayerState(sessionId),
      onError: () =>
        setState((current) => ({
          ...current,
          loading: false,
          loadError: '这轮练习暂时无法恢复，请检查链接后重试。',
        })),
      onSuccess: setState,
    });
  }, [request, sessionId]);
  useEffect(() => {
    void reload();
    return request.invalidate;
  }, [reload, request]);
  return { state, setState, reload };
}

async function loadPracticePlayerState(sessionId: string): Promise<PlayerState> {
  const session = await getPracticeSession(sessionId);
  const extras = await loadPracticeCompletionExtras({
    session,
    loadReport: () => getPracticeReport(session.id),
    loadMastery: getMasteryProfiles,
  });
  if (session.status !== 'in_progress') clearPracticeLocalState(sessionId);
  const restored = restorePracticeWorkspace(session, loadPracticeLocalState(sessionId));
  return {
    ...INITIAL_STATE,
    session,
    drafts: restored.drafts,
    currentIndex: restored.currentIndex,
    report: extras.report,
    mastery: extras.mastery,
    message: practiceRecoveryMessage(restored.recoveredDraftCount),
  };
}

function usePracticeCompletionActions(
  context: PracticeActionContext,
  router: ReturnType<typeof useRouter>,
) {
  const [runExclusive] = useState(createExclusivePracticeCompletionRunner);
  const [runContinuation] = useState(createExclusivePracticeContinuationRunner);
  return {
    ...useAiReportSubmission(context, runExclusive),
    ...useSelfStudyCompletion(context, runExclusive),
    ...useNextPracticeRecommendation(context, router, runContinuation),
    ...useWeaknessReview(context, router, runContinuation),
  };
}

type CompletionRunner = ReturnType<typeof createExclusivePracticeCompletionRunner>;
type ContinuationRunner = ReturnType<typeof createExclusivePracticeContinuationRunner>;

function useAiReportSubmission(context: PracticeActionContext, runExclusive: CompletionRunner) {
  const submitAiReport = useCallback(
    () =>
      runExclusive(async () => {
        const sessionId = context.sessionId;
        const currentSession = context.state.session;
        if (!sessionId || !currentSession) return;
        setBusy(context.setState, 'submit-ai');
        try {
          const reconciliation = await reconcilePracticeReport({
            currentSession,
            submitReport: () => submitPracticeSession(sessionId),
            loadSession: () => getPracticeSession(sessionId),
            loadMastery: getMasteryProfiles,
          });
          clearPracticeLocalState(sessionId);
          const outcome = practiceReportOutcome(reconciliation.synchronizationComplete);
          context.setState((state) => ({
            ...state,
            session: reconciliation.session,
            report: reconciliation.report,
            mastery: reconciliation.mastery ?? state.mastery,
            busy: null,
            issue: null,
            message: outcome.message,
          }));
          context.notifications[outcome.tone]('AI 复盘已生成', outcome.notificationDetail);
        } catch (error) {
          setActionError(context, error, 'AI 复盘生成失败');
        }
      }),
    [context, runExclusive],
  );
  return { submitAiReport };
}

function useSelfStudyCompletion(context: PracticeActionContext, runExclusive: CompletionRunner) {
  const completeSelfStudy = useCallback(
    () =>
      runExclusive(async () => {
        if (!context.sessionId) return;
        setBusy(context.setState, 'submit-self');
        try {
          const session = await completePracticeSelfStudy(context.sessionId);
          clearPracticeLocalState(context.sessionId);
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
      }),
    [context, runExclusive],
  );
  return { completeSelfStudy };
}

function useNextPracticeRecommendation(
  context: PracticeActionContext,
  router: ReturnType<typeof useRouter>,
  runContinuation: ContinuationRunner,
) {
  const [startingNextRecommendation, setStartingNextRecommendation] = useState(false);
  const startNextRecommendation = useCallback(
    () =>
      runContinuation(() =>
        startNextRecommendedPractice({
          loadRecommendations: getPracticeRecommendations,
          createSession: createPracticeSession,
          setStarting: setStartingNextRecommendation,
          onSuccess: (sessionId) => {
            context.notifications.success('下一轮推荐已准备好', '已根据最新能力记录创建专项题单。');
            router.push(`/practice?session=${sessionId}`);
          },
          onError: (error) => {
            context.notifications.error(
              '下一轮推荐暂时不可用',
              error,
              '你可以先从题库自主选题，稍后再试推荐训练。',
            );
          },
        }),
      ),
    [context, router, runContinuation],
  );
  return { startNextRecommendation, startingNextRecommendation };
}

function useWeaknessReview(
  context: PracticeActionContext,
  router: ReturnType<typeof useRouter>,
  runContinuation: ContinuationRunner,
) {
  const [startingWeaknessReview, setStartingWeaknessReview] = useState(false);
  const startWeaknessReview = useCallback(
    () =>
      runContinuation(() =>
        runWeaknessReview({
          createSession: createPracticeSession,
          setStarting: setStartingWeaknessReview,
          onSuccess: (sessionId) => {
            context.notifications.success('薄弱项复练已准备好', '已按最新未掌握题目创建本轮训练。');
            router.push(`/practice?session=${sessionId}`);
          },
          onError: (error) => {
            context.notifications.error(
              '薄弱项复练暂时不可用',
              error,
              '请稍后重试，或先从题库选择新的训练题。',
            );
          },
        }),
      ),
    [context, router, runContinuation],
  );
  return { startWeaknessReview, startingWeaknessReview };
}
