import {
  QuestionCatalogQuerySchema,
  type QuestionCatalogQuery,
  type QuestionCatalogResponse,
} from '@interview-agent/contracts';
import { useCallback, useEffect, useState } from 'react';
import { getQuestionCatalog } from '@/lib/question-catalog-api';
import { createLatestRequestRunner } from '@interview-agent/api-client';

export function useQuestionCatalog(query: QuestionCatalogQuery, enabled: boolean) {
  const [catalog, setCatalog] = useState<QuestionCatalogResponse | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [requestRunner] = useState(createLatestRequestRunner);
  const load = useCallback(() => {
    if (!enabled) return Promise.resolve(false);
    setLoading(true);
    setError('');
    return requestRunner.run({
      load: () => getQuestionCatalog(query),
      onError: () => setError('当前筛选结果没有加载成功，请保留题单后重试。'),
      onSettled: () => setLoading(false),
      onSuccess: setCatalog,
    });
  }, [enabled, query, requestRunner]);
  useEffect(() => {
    if (!enabled) {
      requestRunner.invalidate();
      setCatalog(null);
      setLoading(false);
      setError('');
      return requestRunner.invalidate;
    }
    void load();
    return requestRunner.invalidate;
  }, [enabled, load, requestRunner]);
  return { catalog, loading, error, reload: load };
}

export function catalogQueryFromString(
  value: string,
  learningQuery: { tags: string[]; type: 'single_choice' } | null,
): QuestionCatalogQuery {
  const params = new URLSearchParams(value);
  const param = (key: string) => params.get(key) || undefined;
  const parsed = QuestionCatalogQuerySchema.safeParse({
    query: param('query'),
    category: param('category'),
    tags: param('tags'),
    company: param('company'),
    type: param('type'),
    difficulty: param('difficulty'),
    sort: param('sort'),
    page: param('page'),
  });
  const query = parsed.success ? parsed.data : QuestionCatalogQuerySchema.parse({});
  return learningQuery ? { ...query, ...learningQuery, page: 1 } : query;
}
