import {
  PracticeRecommendationListSchema,
  QuestionCatalogQuerySchema,
  QuestionCatalogResponseSchema,
  RecentPracticeResponseSchema,
  type PracticeRecommendation,
  type QuestionCatalogQuery,
  type QuestionCatalogResponse,
  type RecentPracticeSummary,
} from '@interview-agent/contracts';
import { apiRequest } from './api';

export function getQuestionCatalog(
  input: Partial<QuestionCatalogQuery> = {},
): Promise<QuestionCatalogResponse> {
  const query = QuestionCatalogQuerySchema.parse(input);
  return apiRequest({
    path: questionCatalogPath(query),
    schema: QuestionCatalogResponseSchema,
  });
}

export function getPracticeRecommendations(): Promise<PracticeRecommendation[]> {
  return apiRequest({
    path: '/practice-recommendations',
    schema: PracticeRecommendationListSchema,
  });
}

export function getRecentPractice(): Promise<RecentPracticeSummary | null> {
  return apiRequest({ path: '/practices/recent', schema: RecentPracticeResponseSchema });
}

export function questionCatalogPath(input: Partial<QuestionCatalogQuery>) {
  const params = new URLSearchParams();
  append(params, 'query', input.query);
  append(params, 'category', input.category);
  if (input.tags?.length) append(params, 'tags', input.tags.join(','));
  append(params, 'type', input.type);
  append(params, 'difficulty', input.difficulty);
  append(params, 'sort', input.sort);
  append(params, 'page', input.page);
  append(params, 'pageSize', input.pageSize);
  const query = params.toString();
  return query ? `/question-catalog?${query}` : '/question-catalog';
}

function append(params: URLSearchParams, key: string, value: string | number | undefined) {
  if (value !== undefined && value !== '') params.set(key, String(value));
}
