'use client';

import {
  QuestionCatalogQuerySchema,
  type PracticeRecommendation,
  type QuestionCatalogQuery,
  type QuestionCatalogResponse,
} from '@interview-agent/contracts';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getPracticeRecommendations, getQuestionCatalog } from '@/lib/question-catalog-api';
import { createPracticeSession } from '@/lib/practice-api';
import {
  composeQuestionSelectionWithFeedback,
  toggleQuestionSelection,
} from './question-picker-model';

const QUICK_COMPOSE_TARGET_COUNT = 5;

export type CatalogQuestion = QuestionCatalogResponse['items'][number];

export function useQuestionPicker() {
  const searchParams = useSearchParams();
  const queryKey = searchParams.toString();
  const query = catalogQueryFromString(queryKey);
  const catalogState = useCatalog(queryKey);
  const selection = useQuestionSelection();
  const recommendations = useRecommendations();
  const navigation = useQuestionNavigation(queryKey);
  const { run, error: startError, busyKey } = usePracticeStarter();
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

  const startRecommendation = useCallback((recommendation: PracticeRecommendation) => {
    return run({
      key: recommendation.id,
      title: recommendation.title,
      questionIds: recommendation.questionIds,
      failureMessage: '推荐题单未能创建，不影响你继续自主选题。',
    });
  }, [run]);

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

function useQuestionNavigation(queryKey: string) {
  const router = useRouter();
  const pathname = usePathname();
  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(queryKey);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    router.replace(withQuery(pathname, params), { scroll: false });
  }, [pathname, queryKey, router]);
  const changePage = useCallback((page: number) => {
    const params = new URLSearchParams(queryKey);
    params.set('page', String(page));
    router.replace(withQuery(pathname, params));
  }, [pathname, queryKey, router]);
  return { updateFilter, changePage };
}

function useCatalog(queryKey: string) {
  const [catalog, setCatalog] = useState<QuestionCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCatalog(await getQuestionCatalog(catalogQueryFromString(queryKey)));
    } catch {
      setError('当前筛选结果没有加载成功，请保留题单后重试。');
    } finally {
      setLoading(false);
    }
  }, [queryKey]);
  useEffect(() => { void load(); }, [load]);
  return { catalog, loading, error, reload: load };
}

function useQuestionSelection() {
  const [selected, setSelected] = useState<CatalogQuestion[]>([]);
  const [selectionMessage, setSelectionMessage] = useState('');
  const toggle = useCallback((question: CatalogQuestion) => {
    setSelected((current) => {
      const result = toggleQuestionSelection(current.map((item) => item.id), question.id);
      setSelectionMessage(result.limitReached ? '每轮最多选择 10 题，请先移除一道题。' : '');
      if (result.limitReached) return current;
      return current.some((item) => item.id === question.id)
        ? current.filter((item) => item.id !== question.id)
        : [...current, question];
    });
  }, []);
  const remove = useCallback((id: string) => {
    setSelected((current) => current.filter((item) => item.id !== id));
    setSelectionMessage('');
  }, []);
  const compose = useCallback((candidates: CatalogQuestion[]) => {
    setSelected((current) => {
      const result = composeQuestionSelectionWithFeedback(
        current.map((item) => item.id),
        candidates.map((item) => item.id),
        QUICK_COMPOSE_TARGET_COUNT,
      );
      const questions = new Map([...current, ...candidates].map((item) => [item.id, item]));
      setSelectionMessage(result.message);
      return result.ids.flatMap((id) => {
        const question = questions.get(id);
        return question ? [question] : [];
      });
    });
  }, []);
  const clear = useCallback(() => { setSelected([]); setSelectionMessage(''); }, []);
  return { selected, selectionMessage, toggle, remove, compose, clear };
}

function useRecommendations() {
  const [recommendation, setRecommendation] = useState<PracticeRecommendation | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(true);
  const [recommendationError, setRecommendationError] = useState('');
  const reloadRecommendation = useCallback(async () => {
    setRecommendationError('');
    setRecommendationLoading(true);
    try {
      const items = await getPracticeRecommendations();
      setRecommendation(items[0] ?? null);
    } catch {
      setRecommendationError('Agent 推荐暂时不可用，不影响你自主选题。');
    } finally {
      setRecommendationLoading(false);
    }
  }, []);
  useEffect(() => { void reloadRecommendation(); }, [reloadRecommendation]);
  return { recommendation, recommendationLoading, recommendationError, reloadRecommendation };
}

function usePracticeStarter() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const run = useCallback(async (input: PracticeStartInput) => {
    setError('');
    setBusyKey(input.key);
    try {
      const session = await createPracticeSession({
        title: input.title,
        mode: 'manual',
        questionIds: input.questionIds,
      });
      router.push(`/practice?session=${session.id}`);
    } catch {
      setError(input.failureMessage);
    } finally {
      setBusyKey(null);
    }
  }, [router]);
  return { error, busyKey, run };
}

type PracticeStartInput = {
  key: string;
  title: string;
  questionIds: string[];
  failureMessage: string;
};

function catalogQueryFromString(value: string): QuestionCatalogQuery {
  const params = new URLSearchParams(value);
  const parsed = QuestionCatalogQuerySchema.safeParse({
    query: params.get('query') || undefined,
    category: params.get('category') || undefined,
    tags: params.get('tags') || undefined,
    type: params.get('type') || undefined,
    difficulty: params.get('difficulty') || undefined,
    sort: params.get('sort') || undefined,
    page: params.get('page') || undefined,
  });
  return parsed.success ? parsed.data : QuestionCatalogQuerySchema.parse({});
}

function withQuery(pathname: string, params: URLSearchParams) {
  const value = params.toString();
  return value ? `${pathname}?${value}` : pathname;
}
