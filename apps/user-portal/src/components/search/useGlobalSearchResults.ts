'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getQuestionCatalog } from '@/lib/question-catalog-api';
import {
  filterStaticSearchItems,
  questionSearchItems,
  type GlobalSearchItem,
} from './global-search-model';

const SEARCH_DEBOUNCE_MS = 180;
const SEARCH_PAGE_SIZE = 6;

export type GlobalSearchResultsState = {
  items: GlobalSearchItem[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
};

export function useGlobalSearchResults(query: string): GlobalSearchResultsState {
  const staticItems = useMemo(() => filterStaticSearchItems(query), [query]);
  const [questionItems, setQuestionItems] = useState<GlobalSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const requestVersion = useRef(0);

  useEffect(() => {
    const normalizedQuery = query.trim();
    const version = ++requestVersion.current;
    setQuestionItems([]);
    setError(null);
    if (!normalizedQuery) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    return scheduleQuestionSearch(normalizedQuery, version, requestVersion, {
      setQuestionItems,
      setIsLoading,
      setError,
    });
  }, [query, retryVersion]);

  const retry = useCallback(() => setRetryVersion((value) => value + 1), []);
  const items = useMemo(() => [...questionItems, ...staticItems], [questionItems, staticItems]);
  return { items, isLoading, error, retry };
}

type SearchSetters = {
  setQuestionItems: (items: GlobalSearchItem[]) => void;
  setIsLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
};

function scheduleQuestionSearch(
  query: string,
  version: number,
  currentVersion: React.MutableRefObject<number>,
  setters: SearchSetters,
) {
  const timeout = window.setTimeout(async () => {
    try {
      const catalog = await getQuestionCatalog({ query, page: 1, pageSize: SEARCH_PAGE_SIZE });
      if (version !== currentVersion.current) return;
      setters.setQuestionItems(questionSearchItems(catalog.items));
      setters.setIsLoading(false);
    } catch {
      if (version !== currentVersion.current) return;
      setters.setError('题目搜索暂时不可用，专题和功能入口仍可继续使用。');
      setters.setIsLoading(false);
    }
  }, SEARCH_DEBOUNCE_MS);
  return () => window.clearTimeout(timeout);
}
