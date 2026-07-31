'use client';

import {
  type PracticeRecommendation,
  type QuestionCatalogResponse,
} from '@interview-agent/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getPracticeRecommendations } from '@/lib/question-catalog-api';
import { createPracticeSession } from '@/lib/practice-api';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  composeQuestionSelectionWithFeedback,
  toggleQuestionSelection,
} from './question-picker-model';
import {
  createExclusivePracticeStartRunner,
  startQuestionPractice,
  type PracticeStartInput,
} from './practice-start-single-flight';
import { createLatestQuestionRecommendationRequest } from './question-recommendation-request';
import {
  readQuestionSelection,
  writeQuestionSelection,
  type SelectedQuestion,
  type QuestionSelectionStorage,
} from './question-selection-storage';
import { catalogQueryFromString, useQuestionCatalog } from './question-catalog-state';
import {
  learningPracticeHref,
  type LearningVerification,
} from '@/lib/learning/learning-verification';

const QUICK_COMPOSE_TARGET_COUNT = 5;

export type CatalogQuestion = QuestionCatalogResponse['items'][number];

export function useQuestionPicker(learningVerification: LearningVerification) {
  const searchParams = useSearchParams();
  const { queryKey, query, catalogState } = usePickerCatalog(searchParams, learningVerification);
  const selection = useQuestionSelection();
  const recommendations = useRecommendations();
  const navigation = useQuestionNavigation(queryKey);
  const { run, error: startError, busyKey } = usePracticeStarter(learningVerification);
  const { selected, compose } = selection;

  const start = useCallback(() => {
    if (!selected.length) return;
    return run({
      key: 'selection',
      title: `自主练习 · ${selected.length} 题`,
      questionIds: selected.map((item) => item.id),
      failureMessage: '题单创建失败，已选题目仍为你保留，请稍后重试。',
    });
  }, [run, selected]);

  const startRecommendation = useCallback(
    (recommendation: PracticeRecommendation) => {
      return run({
        key: recommendation.id,
        title: recommendation.title,
        questionIds: recommendation.questionIds,
        failureMessage: '推荐题单未能创建，不影响你继续自主选题。',
      });
    },
    [run],
  );

  const quickCompose = useCallback(() => {
    compose(catalogState.catalog?.items ?? []);
  }, [catalogState.catalog?.items, compose]);

  return {
    query,
    ...catalogState,
    ...selection,
    ...recommendations,
    ...navigation,
    quickCompose,
    start,
    startRecommendation,
    startError,
    starting: busyKey === 'selection',
    recommendationStartingId: busyKey,
  };
}

function usePickerCatalog(
  searchParams: ReturnType<typeof useSearchParams>,
  learningVerification: LearningVerification,
) {
  const queryKey = searchParams.toString();
  const learningQuery = learningVerification.status === 'ready' ? learningVerification.query : null;
  const query = useMemo(
    () => catalogQueryFromString(queryKey, learningQuery),
    [learningQuery, queryKey],
  );
  const enabled =
    learningVerification.status === 'inactive' || learningVerification.status === 'ready';
  const catalogState = useQuestionCatalog(query, enabled);
  return { queryKey, query, catalogState };
}

function useQuestionNavigation(queryKey: string) {
  const router = useRouter();
  const pathname = usePathname();
  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(queryKey);
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete('page');
      router.replace(withQuery(pathname, params), { scroll: false });
    },
    [pathname, queryKey, router],
  );
  const changePage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(queryKey);
      params.set('page', String(page));
      router.replace(withQuery(pathname, params));
    },
    [pathname, queryKey, router],
  );
  return { updateFilter, changePage };
}

function useQuestionSelection() {
  const [selected, setSelected] = useState<SelectedQuestion[]>([]);
  const [selectionMessage, setSelectionMessage] = useState('');
  useEffect(() => {
    const storage = questionSelectionStorage();
    if (storage) setSelected(readQuestionSelection(storage));
  }, []);
  const updateSelected = useCallback(
    (update: (current: SelectedQuestion[]) => SelectedQuestion[]) =>
      setSelected((current) => persistQuestionSelection(update(current))),
    [],
  );
  const toggle = useCallback(
    (question: CatalogQuestion) =>
      updateSelected((current) => toggleSelectedQuestion(current, question, setSelectionMessage)),
    [updateSelected],
  );
  const remove = useCallback(
    (id: string) => {
      updateSelected((current) => current.filter((item) => item.id !== id));
      setSelectionMessage('');
    },
    [updateSelected],
  );
  const compose = useCallback(
    (candidates: CatalogQuestion[]) =>
      updateSelected((current) =>
        composeSelectedQuestions(current, candidates, setSelectionMessage),
      ),
    [updateSelected],
  );
  const clear = useCallback(() => {
    updateSelected(() => []);
    setSelectionMessage('');
  }, [updateSelected]);
  return { selected, selectionMessage, toggle, remove, compose, clear };
}

function toggleSelectedQuestion(
  current: SelectedQuestion[],
  question: CatalogQuestion,
  setMessage: (message: string) => void,
) {
  const result = toggleQuestionSelection(
    current.map((item) => item.id),
    question.id,
  );
  setMessage(result.limitReached ? '每轮最多选择 10 题，请先移除一道题。' : '');
  if (result.limitReached) return current;
  return current.some((item) => item.id === question.id)
    ? current.filter((item) => item.id !== question.id)
    : [...current, selectedQuestion(question)];
}

function composeSelectedQuestions(
  current: SelectedQuestion[],
  candidates: CatalogQuestion[],
  setMessage: (message: string) => void,
) {
  const result = composeQuestionSelectionWithFeedback(
    current.map((item) => item.id),
    candidates.map((item) => item.id),
    QUICK_COMPOSE_TARGET_COUNT,
  );
  const questions = new Map([...current, ...candidates].map((item) => [item.id, item]));
  setMessage(result.message);
  return result.ids.flatMap((id) => {
    const question = questions.get(id);
    return question ? [selectedQuestion(question)] : [];
  });
}

function persistQuestionSelection(selected: SelectedQuestion[]) {
  const storage = questionSelectionStorage();
  if (storage) writeQuestionSelection(storage, selected);
  return selected;
}

function selectedQuestion(question: SelectedQuestion): SelectedQuestion {
  return { id: question.id, title: question.title };
}

function questionSelectionStorage(): QuestionSelectionStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function useRecommendations() {
  const [recommendation, setRecommendation] = useState<PracticeRecommendation | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(true);
  const [recommendationError, setRecommendationError] = useState('');
  const [request] = useState(() =>
    createLatestQuestionRecommendationRequest<PracticeRecommendation>(),
  );
  const reloadRecommendation = useCallback(() => {
    setRecommendationError('');
    setRecommendationLoading(true);
    return request.load({
      load: getPracticeRecommendations,
      onError: () => setRecommendationError('Agent 推荐暂时不可用，不影响你自主选题。'),
      onSettled: () => setRecommendationLoading(false),
      onSuccess: setRecommendation,
    });
  }, [request]);
  useEffect(() => {
    void reloadRecommendation();
    return request.invalidate;
  }, [reloadRecommendation, request]);
  return { recommendation, recommendationLoading, recommendationError, reloadRecommendation };
}

function usePracticeStarter(learningVerification: LearningVerification) {
  const router = useRouter();
  const notifications = useNotifications();
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [runExclusive] = useState(createExclusivePracticeStartRunner);
  const run = useCallback(
    (input: PracticeStartInput) =>
      runExclusive(async () => {
        setError('');
        await startQuestionPractice({
          input,
          createSession: createPracticeSession,
          setBusyKey,
          onSuccess: (sessionId) => {
            notifications.success('练习题单已创建', '服务端已保存本轮题目，即将进入练习空间。');
            router.push(learningPracticeHref(sessionId, learningVerification));
          },
          onError: (error) => {
            setError(input.failureMessage);
            notifications.error('练习题单创建失败', error, input.failureMessage);
          },
        });
      }),
    [learningVerification, notifications, router, runExclusive],
  );
  return { error, busyKey, run };
}

function withQuery(pathname: string, params: URLSearchParams) {
  const value = params.toString();
  return value ? `${pathname}?${value}` : pathname;
}
