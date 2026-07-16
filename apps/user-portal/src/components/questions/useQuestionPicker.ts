'use client';

import {
  QuestionCatalogQuerySchema,
  type QuestionCatalogQuery,
  type QuestionCatalogResponse,
} from '@interview-agent/contracts';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getQuestionCatalog } from '@/lib/question-catalog-api';
import { createPracticeSession } from '@/lib/practice-api';
import { toggleQuestionSelection } from './question-picker-model';

export type CatalogQuestion = QuestionCatalogResponse['items'][number];

export function useQuestionPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryKey = searchParams.toString();
  const query = catalogQueryFromString(queryKey);
  const catalogState = useCatalog(queryKey);
  const selection = useQuestionSelection();
  const [startError, setStartError] = useState('');
  const [starting, setStarting] = useState(false);

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

  const start = useCallback(async () => {
    if (!selection.selected.length) return;
    setStartError('');
    setStarting(true);
    try {
      const session = await createPracticeSession({
        title: `自主练习 · ${selection.selected.length} 题`,
        mode: 'manual',
        questionIds: selection.selected.map((item) => item.id),
      });
      router.push(`/practice?session=${session.id}`);
    } catch {
      setStartError('题单创建失败，已选题目仍为你保留，请稍后重试。');
    } finally {
      setStarting(false);
    }
  }, [router, selection.selected]);

  return { query, ...catalogState, ...selection, updateFilter, changePage, start, startError, starting };
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
  const clear = useCallback(() => { setSelected([]); setSelectionMessage(''); }, []);
  return { selected, selectionMessage, toggle, remove, clear };
}

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
